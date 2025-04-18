import React, { useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { FiX, FiBook, FiTrash2 } from "react-icons/fi";
import { getPapers, deletePaper } from "../../api/paperApi";
import { useAppStore } from "../../store/useAppStore";
import { useContentStore } from "../../store/useContentStore";
import { Paper } from "@paer/shared";
import { toast } from "react-hot-toast";

// 날짜 포맷팅 함수
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

interface PaperListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaperListModal: React.FC<PaperListModalProps> = ({ isOpen, onClose }) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAppStore();
  const { setContent } = useContentStore();

  // 논문 목록 가져오기
  useEffect(() => {
    const fetchPapers = async () => {
      if (!userId || !isOpen) return;
      
      try {
        setLoading(true);
        setError(null);
        const papersData = await getPapers(userId);
        setPapers(Array.isArray(papersData) ? papersData : []);
      } catch (err) {
        console.error("Failed to fetch papers:", err);
        setError("논문 목록을 가져오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchPapers();
  }, [userId, isOpen]);

  // 논문 선택 처리
  const handleSelectPaper = (paper: Paper) => {
    setContent(paper);
    onClose();
  };

  // 논문 삭제 처리
  const handleDeletePaper = async (paperId: string | undefined, event: React.MouseEvent) => {
    event.stopPropagation(); // 이벤트 버블링 방지
    
    if (!paperId) {
      toast.error("유효하지 않은 논문 ID입니다.");
      return;
    }
    
    if (!window.confirm("이 논문을 삭제하시겠습니까?")) {
      return;
    }

    if (!userId) {
      toast.error("사용자 정보가 없습니다. 다시 로그인해주세요.");
      return;
    }

    try {
      const response = await deletePaper(paperId, userId);
      if (response.success) {
        // 삭제된 논문을 목록에서 제거
        setPapers(papers.filter(paper => paper._id !== paperId));
        toast.success("논문이 삭제되었습니다.");
        onClose(); // 삭제 성공 후 모달 닫기
      } else {
        throw new Error(response.error || "논문 삭제에 실패했습니다.");
      }
    } catch (err) {
      console.error("Failed to delete paper:", err);
      toast.error(err instanceof Error ? err.message : "논문 삭제에 실패했습니다.");
    }
  };

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={onClose}>
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>

          {/* 모달 컨테이너 위치 조정 */}
          <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
          
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 flex justify-between items-center">
                <span>논문 목록</span>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <FiX size={20} />
                </button>
              </Dialog.Title>
              
              <div className="mt-4">
                {loading ? (
                  <div className="py-4 text-center text-gray-500">
                    논문 목록을 불러오는 중...
                  </div>
                ) : error ? (
                  <div className="py-4 text-center text-red-500">
                    {error}
                  </div>
                ) : papers.length === 0 ? (
                  <div className="py-4 text-center text-gray-500">
                    등록된 논문이 없습니다.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
                    {papers.map((paper) => (
                      <li 
                        key={paper._id} 
                        className="py-3 px-2 hover:bg-gray-50 cursor-pointer transition-colors rounded group"
                        onClick={() => handleSelectPaper(paper)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 pt-1">
                              <FiBook className="text-blue-500" size={18} />
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-gray-900">{paper.title || "제목 없음"}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {paper.updatedAt 
                                  ? `최종 수정: ${formatDate(new Date(paper.updatedAt))}` 
                                  : "날짜 정보 없음"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeletePaper(paper._id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                            title="논문 삭제"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default PaperListModal; 