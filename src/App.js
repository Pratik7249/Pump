import './App.css';
import TankPumpPanel from './pump';

function App() {
  return (
    <div className="App">
      <TankPumpPanel capacity={2000} height={800}/>
    </div>
  );
}

export default App;
