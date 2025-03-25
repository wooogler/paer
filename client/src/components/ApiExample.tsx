import React, { useEffect, useState } from "react";
import api from "../services/api";

interface DataItem {
  id: number;
  name: string;
}

const ApiExample: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/data");
        setData(response.data.data);
        setError(null);
      } catch (err) {
        console.error("API call error:", err);
        setError("An error occurred while fetching data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-4">Loading data...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Backend API Data</h2>
      <ul className="list-disc pl-5">
        {data.map((item) => (
          <li key={item.id} className="mb-2">
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ApiExample;
