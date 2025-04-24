import React, { useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { FiX, FiUser, FiPlus, FiTrash2 } from "react-icons/fi";
import { getCollaborators, addCollaborator, removeCollaborator } from "../../api/paperApi";
import { getAllUsers } from "../../api/userApi";
import { useContentStore } from "../../store/useContentStore";
import { toast } from "react-hot-toast";
import { useAppStore } from "../../store/useAppStore";

interface Collaborator {
  userId: string;
  username: string;
}

interface User {
  _id: string;
  username: string;
  email: string;
}

interface CollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CollaboratorModal: React.FC<CollaboratorModalProps> = ({ isOpen, onClose }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [isAdding, setIsAdding] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await getAllUsers();
        if (response.success && Array.isArray(response.users)) {
          setAllUsers(response.users);
        } else {
          toast.error("Failed to load users");
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
        toast.error("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (allUsers.length > 0 && userId) {
      // 현재 로그인한 유저와 이미 협력자로 등록된 유저를 제외
      const collaboratorIds = collaborators.map(c => c.userId);
      const filtered = allUsers.filter(user => 
        user._id !== userId && !collaboratorIds.includes(user._id)
      );
      setFilteredUsers(filtered);
    }
  }, [allUsers, collaborators, userId]);

  const handleAddCollaborator = async () => {
    if (!selectedPaperId || !userId || !selectedUser) return;

    try {
      setIsAdding(true);
      const response = await addCollaborator(selectedPaperId, userId, selectedUser);
      if (response.success) {
        toast.success("Collaborator added successfully");
        // Refresh collaborators list
        const collaboratorsData = await getCollaborators(selectedPaperId, userId);
        setCollaborators(Array.isArray(collaboratorsData) ? collaboratorsData : []);
        setSelectedUser("");
      } else {
        throw new Error(response.error || "Failed to add collaborator");
      }
    } catch (err) {
      console.error("Failed to add collaborator:", err);
      toast.error(err instanceof Error ? err.message : "Failed to add collaborator");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorUsername: string) => {
    if (!selectedPaperId || !userId) return;

    try {
      setIsAdding(true);
      const response = await removeCollaborator(selectedPaperId, userId, collaboratorUsername);
      if (response.success) {
        toast.success("Collaborator removed successfully");
        // Refresh collaborators list
        const collaboratorsData = await getCollaborators(selectedPaperId, userId);
        setCollaborators(Array.isArray(collaboratorsData) ? collaboratorsData : []);
      } else {
        throw new Error(response.error || "Failed to remove collaborator");
      }
    } catch (err) {
      console.error("Failed to remove collaborator:", err);
      toast.error(err instanceof Error ? err.message : "Failed to remove collaborator");
    } finally {
      setIsAdding(false);
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
                {/* Add collaborator dropdown */}
                <div className="mb-4">
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="">Select a user</option>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <option key={user._id} value={user.username}>
                            {user.username} ({user.email || 'No email'})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No users available</option>
                      )}
                    </select>
                    <button
                      onClick={handleAddCollaborator}
                      disabled={!selectedUser || isAdding}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {isAdding ? "Adding..." : "Add"}
                    </button>
                  </div>
                </div>

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
                      <li key={collaborator.userId} className="py-3 px-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 pt-1">
                              <FiUser className="text-blue-500" size={18} />
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-gray-900">{collaborator.username}</p>
                              <p className="text-xs text-gray-500 mt-1">ID: {collaborator.userId}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveCollaborator(collaborator.username)}
                            className="text-red-500 hover:text-red-700 focus:outline-none"
                            disabled={isAdding}
                          >
                            <FiTrash2 size={18} />
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

export default CollaboratorModal; 