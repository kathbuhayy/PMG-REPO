
import React, { useState, useEffect, useCallback } from "react";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";

const STATUS_LABELS = {
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
};

function StaffMyTasks() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  const fetchAssignments = useCallback(async () => {
    try {
      setError("");
      const res = await adminFetch(buildApiUrl("/api/me/assignments"));
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load assignments.");
      }

      setAssignments(data.assignments || []);
    } catch (err) {
      console.error("Fetch assignments error:", err);
      setError(err.message || "Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const updateStatus = async (assignmentId, status) => {
    try {
      setUpdatingId(assignmentId);
      setError("");

      const res = await adminFetch(
        buildApiUrl(`/api/assignments/${assignmentId}/status`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update assignment.");
      }

      await fetchAssignments();
    } catch (err) {
      console.error("Update assignment error:", err);
      setError(err.message || "Failed to update assignment.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <div className="data-table-card">Loading your assignments...</div>;
  }

  return (
    <div>
      <div className="data-table-head">
        <div>
          <h2>My Assigned Tasks</h2>
          <p className="subtitle">
            Orders assigned to you by your Branch Admin.
          </p>
        </div>
        <button type="button" className="row-btn" onClick={fetchAssignments}>
          Refresh
        </button>
      </div>

      {error && (
        <p role="alert" style={{ color: "#dc2626", marginBottom: "12px" }}>
          {error}
        </p>
      )}

      <div className="data-table-card">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Branch</th>
                <th>Assigned By</th>
                <th>Assignment Status</th>
                <th>Order Stage</th>
                <th>Due Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td className="empty-row" colSpan={8}>
                    You have no active assignments.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => {
                  const order = assignment.order;
                  const customer = order?.user;
                  const assignedBy = assignment.assignedBy;
                  const isUpdating = updatingId === assignment.id;

                  return (
                    <tr key={assignment.id}>
                      <td>#{order?.id ?? "—"}</td>
                      <td>
                        {customer
                          ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
                          : "—"}
                      </td>
                      <td>{order?.branch?.name || "—"}</td>
                      <td>
                        {assignedBy
                          ? `${assignedBy.first_name || ""} ${assignedBy.last_name || ""}`.trim()
                          : "—"}
                      </td>
                      <td>
                        {STATUS_LABELS[assignment.status] || assignment.status}
                      </td>
                      <td>
                        {order?.productionStatus || "—"}
                      </td>
                      <td>
                        {order?.due_date
                          ? new Date(order.due_date).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        {assignment.status === "assigned" && (
                          <button
                            type="button"
                            className="row-btn"
                            disabled={isUpdating}
                            onClick={() =>
                              updateStatus(assignment.id, "in_progress")
                            }
                          >
                            {isUpdating ? "Updating..." : "Start"}
                          </button>
                        )}

                        {assignment.status === "in_progress" && (
                          <button
                            type="button"
                            className="row-btn"
                            disabled={isUpdating}
                            onClick={() =>
                              updateStatus(assignment.id, "completed")
                            }
                          >
                            {isUpdating ? "Updating..." : "Complete"}
                          </button>
                        )}

                        {assignment.status === "completed" && "Done"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StaffMyTasks;