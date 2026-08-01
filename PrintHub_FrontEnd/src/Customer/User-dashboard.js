import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './User-dashboard.css';
import AppModal from '../components/AppModal';

function CustomerDashboard() {
    const navigate = useNavigate();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [activeItem, setActiveItem] = useState('dashboard');
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [noticeModal, setNoticeModal] = useState(null);

    // swipe tracking
    let touchStartX = 0;
    let touchEndX = 0;

    const menuItems = [
        {id: 'profile', label: 'Profile', path: '/admin-profile'},
        {id: 'dashboard', label: 'Dashboard', path: '/admin-dashboard'},
        {id: 'orders', label: 'Orders', path: '/admin/orders'},
        {id: 'products', label: 'Products', path: '/admin/products'},
        {id: 'customers', label: 'Customers', path: '/admin/customers'},
        {id: 'analytics', label: 'Analytics', path: '/admin/analytics'},
        {id: 'settings', label: 'Settings', path: '/admin/settings'},
    ];

    // Search function
    const handleSearch = (query) => {
        setSearchQuery(query);
        
        if (query.trim() === '') {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        // Search through menu items
        const results = menuItems.filter(item => 
            item.label.toLowerCase().includes(query.toLowerCase())
        );
        
        setSearchResults(results);
        setShowSearchResults(true);
    };

    const handleSearchResultClick = (result) => {
        setActiveItem(result.id);
        if (result.path) {
            navigate(result.path);
        }
        setSearchQuery('');
        setShowSearchResults(false);
        setIsMobileOpen(false);
    };

    const handleMenuItemClick = (item) => {
        setActiveItem(item.id);
        if (item.path) {
            navigate(item.path);
            setIsMobileOpen(false);
        }
    };

    const handleLogout = () => {
        console.log('Logging out...');

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');

        sessionStorage.clear();

        document.cookie.split(";").forEach(function(c) {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        setActiveItem('App');
        setIsCollapsed(false);
        setIsMobileOpen(false);

        setNoticeModal({
            title: 'Logged out',
            message: 'You have been logged out successfully.',
            tone: 'success',
        });
    };

    // swipe handlers
    const handleTouchStart = (e) => {
        touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchMove = (e) => {
        touchEndX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = () => {
        if (touchStartX - touchEndX > 50) {
            setIsMobileOpen(false);
        }
        if (touchEndX - touchStartX > 50) {
            setIsMobileOpen(true);
        }
    };

    return (
        <div className="admin-dashboard">

            {/* Sidebar */}
            <div
                className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className='sidebar-header'>
                    {!isCollapsed && <h2 className="sidebar-title">Admin Panel</h2>}
                    <button
                        className="collapse-btn"
                        onClick={() => {
                            setIsCollapsed(!isCollapsed);
                            setIsMobileOpen(false);
                        }}
                        title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                    >
                        {isCollapsed ? '→' : '←'}
                    </button>
                </div>

                {!isCollapsed && (
                    <div className="user-info">
                        <div className="user-avatar">
                            <div className="avatar-circle">AD</div>
                        </div>
                        <div className="user-details">
                            <h4 className="user-name">Admin User</h4>
                            <p className="user-role">Administrator</p>
                        </div>
                    </div>
                )}

                {isCollapsed && (
                    <div className="user-collapsed">
                        <div className="avatar-small">A</div>
                    </div>
                )}

                <nav className="sidebar-menu">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            className={`menu-item ${activeItem === item.id ? 'active' : ''}`}
                            onClick={() => handleMenuItemClick(item)}
                            title={isCollapsed ? item.label : ''}
                        >
                            {!isCollapsed && <span className="menu-label">{item.label}</span>}
                            {isCollapsed && <span className="menu-label-collapsed">{item.label.charAt(0)}</span>}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-bottom">
                    <button
                        className="logout-btn"
                        onClick={handleLogout}
                        title={isCollapsed ? 'Logout' : ''}
                    >
                        {!isCollapsed && 'Logout'}
                    </button>
                </div>
            </div>

            {/* dark overlay */}
            {isMobileOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Main Content Area */}
            <main className="dashboard-content">

                <header className="dashboard-header">
                    {/* mobile menu button */}
                    <button
                        className="mobile-menu-btn"
                        onClick={() => setIsMobileOpen(true)}
                    >
                        ☰
                    </button>

                    <div className="header-left">
                        <h1>Dashboard</h1>
                        <p className="subtitle">Welcome back, Admin!</p>
                    </div>

                    {/* Search Bar */}
                    <div className="search-container" style={{ position: 'relative', marginLeft: 'auto', marginRight: '20px' }}>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search menu items..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            onFocus={() => searchQuery.trim() && setShowSearchResults(true)}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #ddd',
                                width: '250px',
                                fontSize: '14px'
                            }}
                        />
                        
                        {/* Search Results Dropdown */}
                        {showSearchResults && (
                            <div className="search-results" style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                left: 0,
                                backgroundColor: 'white',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                marginTop: '5px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                zIndex: 1000,
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}>
                                {searchResults.length > 0 ? (
                                    searchResults.map(result => (
                                        <div
                                            key={result.id}
                                            className="search-result-item"
                                            onClick={() => handleSearchResultClick(result)}
                                            style={{
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #f0f0f0',
                                                transition: 'background-color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                        >
                                            <div style={{ fontWeight: '500' }}>{result.label}</div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>Navigate to {result.label}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ padding: '10px 12px', color: '#999', textAlign: 'center' }}>
                                        No results found for "{searchQuery}"
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="header-right">
                        <div className="stats-summary">
                            <span className="stat-item">📊 1,234 Users</span>
                            <span className="stat-item">💰 $45,678</span>
                            <span className="stat-item">📦 567 Orders</span>
                        </div>
                    </div>
                </header>

                <div className="content-wrapper">
                    <div className="content-grid">
                        <div className="stats-card">
                            <h3>Total Revenue</h3>
                            <p className="stat-number">$45,678</p>
                        </div>

                        <div className="stats-card">
                            <h3>New Users</h3>
                            <p className="stat-number">1,234</p>
                        </div>

                        <div className="stats-card">
                            <h3>Orders</h3>
                            <p className="stat-number">567</p>
                        </div>

                        <div className="stats-card">
                            <h3>Conversion Rate</h3>
                            <p className="stat-number">3.4%</p>
                        </div>

                        <div className="recent-activity">
                            <h2>Recent Activity</h2>
                        </div>
                    </div>
                </div>
            </main>
            <AppModal
                open={Boolean(noticeModal)}
                title={noticeModal?.title}
                message={noticeModal?.message}
                tone={noticeModal?.tone}
                onConfirm={() => {
                    setNoticeModal(null);
                    window.location.href = '/';
                }}
            />
        </div>
    );
}

export default CustomerDashboard;
