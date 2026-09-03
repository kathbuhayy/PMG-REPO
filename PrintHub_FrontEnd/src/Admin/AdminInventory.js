import React, { useState, useEffect, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";
import { FaExclamationTriangle, FaWarehouse } from "react-icons/fa";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

function AdminInventory() {
  const [materials, setMaterials] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ type: "substrate", name: "", stock: "", safetyThreshold: "15" });
  const [editingId, setEditingId] = useState(null);
    const [editValues, setEditValues] = useState({ addStock: "", safetyThreshold: "" });
  const [saving, setSaving] = useState(false);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await adminFetch(buildApiUrl("/api/admin/inventory"));
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load inventory");
      setMaterials(data.materials || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err.message || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    const interval = setInterval(fetchInventory, 30000);
    return () => clearInterval(interval);
  }, [fetchInventory]);

    const handleAddMaterial = async () => {
    if (!newMaterial.name || newMaterial.stock === "") return;
    setSaving(true);
    try {
      const res = await adminFetch(buildApiUrl("/api/admin/inventory"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMaterial),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add material");
      setNewMaterial({ type: "substrate", name: "", stock: "", safetyThreshold: "15" });
      setShowAddForm(false);
      await fetchInventory();
    } catch (err) {
      alert(err.message || "Failed to add material");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (material) => {
    setEditingId(material.id);
    setEditValues({ addStock: "", safetyThreshold: material.safetyThreshold });
  };

    const saveEdit = async (material) => {
    if (editValues.addStock && parseFloat(editValues.addStock) < 0) {
      alert("Stock can only be added, not removed.");
      return;
    }
    setSaving(true);
    try {
      const res = await adminFetch(
        buildApiUrl(`/api/admin/inventory/${material.type}/${material.id.split("-")[1]}`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editValues),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update material");
      setEditingId(null);
      await fetchInventory();
    } catch (err) {
      alert(err.message || "Failed to update material");
    } finally {
      setSaving(false);
    }
  };

  if (loading && materials.length === 0) {
    return <div className="coming-soon"><p>Loading inventory...</p></div>;
  }

  if (error) {
    return (
      <div className="coming-soon">
        <div className="coming-soon-icon"><FaExclamationTriangle /></div>
        <h3>Couldn't load inventory</h3>
        <p>{error}</p>
      </div>
    );
  }

  const chartData = {
    labels: materials.map((m) => `${m.name} (${m.unit})`),
    datasets: [
      {
        label: "Current Stock",
        data: materials.map((m) => m.stock),
        backgroundColor: materials.map((m) =>
          m.belowThreshold ? "#ef4444" : "#2563eb"
        ),
        borderRadius: 4,
      },
      {
        label: "Safety Threshold",
        data: materials.map((m) => m.safetyThreshold),
        backgroundColor: "#e2e8f0",
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      title: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-header-title">Inventory</h1>
        <p className="admin-page-header-desc">
          Track material stock levels and safety thresholds.
        </p>
      </div>

      {summary && (
        <div className="dash-stat-grid" style={{ marginBottom: "20px" }}>
          <div className="dash-stat-card tone-blue">
            <div className="dash-stat-top">
              <span className="dash-stat-label">Tracked Materials</span>
              <span className="dash-stat-icon"><FaWarehouse /></span>
            </div>
            <p className="dash-stat-value">{summary.total}</p>
          </div>
          <div className="dash-stat-card tone-red">
            <div className="dash-stat-top">
              <span className="dash-stat-label">Below Safety Threshold</span>
              <span className="dash-stat-icon"><FaExclamationTriangle /></span>
            </div>
            <p className="dash-stat-value">{summary.belowThreshold}</p>
          </div>
        </div>
      )}

      <div className="data-table-card" style={{ marginTop: 0, padding: "20px" }}>
        <h3 style={{ marginTop: 0 }}>Stock Levels vs. Safety Threshold</h3>
        {materials.length === 0 ? (
          <p style={{ color: "#94a3b8", fontSize: "13px" }}>No materials tracked yet.</p>
        ) : (
          <Bar data={chartData} options={chartOptions} />
        )}
      </div>

            <div className="data-table-card" style={{ marginTop: "16px" }}>
        <div className="data-table-head">
          <h3>Material Details</h3>
          <button type="button" className="row-btn" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? "Cancel" : "+ Add Material"}
          </button>
        </div>

        {showAddForm && (
          <div style={{ display: "flex", gap: "10px", padding: "0 20px 16px", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="dashform-group" style={{ margin: 0 }}>
              <label>Type</label>
              <select
                value={newMaterial.type}
                onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value })}
              >
                <option value="substrate">Substrate</option>
                <option value="ink">Ink</option>
                <option value="unit">Unit (per-piece blanks)</option>
              </select>
            </div>
            <div className="dashform-group" style={{ margin: 0 }}>
              <label>Name</label>
              <input
                type="text"
                value={newMaterial.name}
                onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
                placeholder="e.g. glossy_vinyl"
              />
            </div>
            <div className="dashform-group" style={{ margin: 0 }}>
              <label>Starting Stock</label>
              <input
                type="number"
                value={newMaterial.stock}
                onChange={(e) => setNewMaterial({ ...newMaterial, stock: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="dashform-group" style={{ margin: 0 }}>
              <label>Safety Threshold</label>
              <input
                type="number"
                value={newMaterial.safetyThreshold}
                onChange={(e) => setNewMaterial({ ...newMaterial, safetyThreshold: e.target.value })}
              />
            </div>
            <button type="button" className="row-btn" disabled={saving} onClick={handleAddMaterial}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        )}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Type</th>
                <th>Current Stock</th>
                <th>Safety Threshold</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td style={{ textTransform: "capitalize" }}>{m.type}</td>
                                    {editingId === m.id ? (
                    <>
                      <td>
                        <input
                          type="number"
                          min="0"
                          placeholder={`current: ${m.stock}`}
                          value={editValues.addStock}
                          onChange={(e) => setEditValues({ ...editValues, addStock: e.target.value })}
                          style={{ width: "110px" }}
                        />
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>+ amount to add</div>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editValues.safetyThreshold}
                          onChange={(e) => setEditValues({ ...editValues, safetyThreshold: e.target.value })}
                          style={{ width: "90px" }}
                        />
                      </td>
                      <td colSpan={2}>
                        <button type="button" className="row-btn" disabled={saving} onClick={() => saveEdit(m)}>
                          {saving ? "..." : "Save"}
                        </button>
                        <button type="button" className="row-btn" onClick={() => setEditingId(null)} style={{ marginLeft: "6px" }}>
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{m.stock} {m.unit}</td>
                      <td>{m.safetyThreshold} {m.unit}</td>
                      <td>
                        <span className={`dashpage-pill status-${m.belowThreshold ? "cancelled" : "paid"}`}>
                          {m.belowThreshold ? "Low Stock" : "OK"}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="row-btn" onClick={() => startEdit(m)}>
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminInventory;