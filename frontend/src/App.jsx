import Header from "./components/Header";
import VolumeViewer from "./components/VolumeViewer";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Header />
      <main className="dashboard">
        <VolumeViewer />
      </main>
    </div>
  );
}

export default App;