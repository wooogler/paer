import Layout from "./components/Layout";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <>
      <Layout />
      <Toaster position="top-center" />
    </>
  );
}

export default App;
