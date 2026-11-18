function Header() {
  return (
    <header className="header">
      <div className="logo">
        <span className="logo-icon">N</span>
        <div>
          <h1>NeuroView 3D</h1>
          <p>Brain MRI Visualization</p>
        </div>
      </div>
      <div className="header-info">
        <span className="status-dot"></span>
        System Ready
      </div>
    </header>
  );
}

export default Header;