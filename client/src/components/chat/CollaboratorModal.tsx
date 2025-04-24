import React, { useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { FiX, FiUser } from "react-icons/fi";
import { getCollaborators } from "../../api/paperApi";
import { useContentStore } from "../../store/useContentStore";
import { toast } from "react-hot-toast";
import { useAppStore } from "../../store/useAppStore";

interface Collaborator {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface CollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CollaboratorModal: React.FC<CollaboratorModalProps> = ({ isOpen, onClose }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedPaperId } = useContentStore();
  const { userId } = useAppStore();

  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!selectedPaperId || !isOpen) return;
      
      try {
        setLoading(true);
        setError(null);
        const collaboratorsData = await getCollaborators(selectedPaperId, userId);
        setCollaborators(Array.isArray(collaboratorsData) ? collaboratorsData : []);
      } catch (err) {
        console.error("Failed to fetch collaborators:", err);
        setError("Failed to fetch collaborators.");
        toast.error("Failed to fetch collaborators.");
      } finally {
        setLoading(false);
      }
    };

    fetchCollaborators();
  }, [selectedPaperId, isOpen, userId]);

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
                <span>Collaborators</span>
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
                    Loading collaborators...
                  </div>
                ) : error ? (
                  <div className="py-4 text-center text-red-500">
                    {error}
                  </div>
                ) : collaborators.length === 0 ? (
                  <div className="py-4 text-center text-gray-500">
                    No collaborators found.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
                    {collaborators.map((collaborator) => (
                      <li key={collaborator._id} className="py-3 px-2">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 pt-1">
                            <FiUser className="text-blue-500" size={18} />
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">{collaborator.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{collaborator.email}</p>
                            <p className="text-xs text-gray-500 mt-1">Role: {collaborator.role}</p>
                          </div>
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

export default CollaboratorModal; 