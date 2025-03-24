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
        console.error("API 호출 오류:", err);
        setError("데이터를 가져오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-4">데이터를 불러오는 중...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">백엔드 API 데이터</h2>
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
