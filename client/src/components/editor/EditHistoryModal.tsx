import React, { useEffect, useState } from "react";
import { getEditHistoryByBlock } from "../../api/paperApi";
import { getUserInfo } from "../../api/userApi";
import { ClipLoader } from "react-spinners";

const EditHistoryModal = ({ block, paperId, userId, onClose }: { block: any; paperId: string; userId: string; onClose: () => void }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usernames, setUsernames] = useState<{ [authorId: string]: string }>({});

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const blockId = block["block-id"];
        console.log("paperId:", paperId, "blockId:", blockId, "userId:", userId);
        if (!paperId || !blockId || !userId) {
          setError("Missing paperId, blockId, or userId");
          setLoading(false);
          return;
        }
        const edits = await getEditHistoryByBlock(paperId, blockId, userId);
        if (!isMounted) return;
        setHistory(edits);
        // Fetch usernames for all unique authorIds
        const uniqueAuthorIds: string[] = Array.from(new Set(edits.map((e: any) => e.authorId)));
        const usernameMap: { [authorId: string]: string } = {};
        await Promise.all(uniqueAuthorIds.map(async (id: string) => {
          try {
            const userInfo = await getUserInfo(id);
            usernameMap[id] = userInfo.user.username;
          } catch {
            usernameMap[id] = id;
          }
        }));
        if (isMounted) setUsernames(usernameMap);
      } catch (err: any) {
        setError("Failed to fetch edit history");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchHistory();
    return () => { isMounted = false; };
  }, [block, paperId, userId]);

  return (
    <div style={{ position: 'fixed', top: 80, left: 0, right: 0, margin: '0 auto', zIndex: 50, background: 'white', border: '1px solid #ccc', borderRadius: 8, maxWidth: 480, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 600 }}>Edit history for: {block.title || block.intent || block.summary}</div>
        <button onClick={onClose} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><ClipLoader size={32} /></div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : history.length === 0 ? (
        <div style={{ color: '#888' }}>No edit history found for this block.</div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {history.map((edit, idx) => (
            <div key={idx} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
              <div style={{ fontWeight: 500 }}>{usernames[edit.authorId] || edit.authorId}</div>
              <div style={{ fontSize: 13, color: '#666' }}>
                Edited <b>{edit.key}</b> to <span style={{ color: '#333' }}>{edit.value}</span>
              </div>
              <div style={{ fontSize: 12, color: '#aaa' }}>{new Date(edit.timestamp).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EditHistoryModal; 