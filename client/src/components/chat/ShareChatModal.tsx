import React, { useEffect, useState } from 'react';
import { Message } from '../../api/chatApi';
import { FiX, FiCopy, FiShare2, FiUsers } from 'react-icons/fi';
import { useAppStore } from '../../store/useAppStore';
import { useContentStore } from '../../store/useContentStore';
import { getCollaborators } from '../../api/paperApi';
import { getAllUsers } from '../../api/userApi';
import { toast } from 'react-hot-toast';

interface ShareChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMessages: Message[];
}

interface Collaborator {
  userId: string;
  username: string;
}

const ShareChatModal: React.FC<ShareChatModalProps> = ({
  isOpen,
  onClose,
  selectedMessages,
}) => {
  const [canShare, setCanShare] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const { userName: currentUserName, userId } = useAppStore();
  const { selectedPaperId } = useContentStore();

  useEffect(() => {
    setCanShare(!!navigator.share);
  }, []);

  useEffect(() => {
    const fetchCollaborators = async () => {
      if (!selectedPaperId || !userId || !isOpen) return;
      
      try {
        setLoading(true);
        const collaboratorsData = await getCollaborators(selectedPaperId, userId);
        // Add username to collaborator data
        const collaboratorsWithUsername = await Promise.all(
          collaboratorsData.map(async (collaboratorId: string) => {
            try {
              const userResponse = await getAllUsers();
              const user = userResponse.users.find((u: any) => u._id === collaboratorId);
              return {
                userId: collaboratorId,
                username: user ? user.username : 'Unknown User'
              };
            } catch (err) {
              console.error("Failed to fetch user details:", err);
              return {
                userId: collaboratorId,
                username: 'Unknown User'
              };
            }
          })
        );
        setCollaborators(collaboratorsWithUsername);
      } catch (err) {
        console.error("Failed to fetch collaborators:", err);
        toast.error("Failed to fetch collaborators");
      } finally {
        setLoading(false);
      }
    };

    fetchCollaborators();
  }, [selectedPaperId, userId, isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const formattedMessages = selectedMessages
      .map(msg => {
        const displayName = msg.role === 'user' 
          ? (msg.userName || currentUserName || 'Unknown User')
          : (msg.role === 'assistant' ? 'Assistant' : 'System');
        return `${displayName}: ${msg.content}`;
      })
      .join('\n\n');
    navigator.clipboard.writeText(formattedMessages);
    toast.success('Messages copied to clipboard');
  };

  const handleShare = () => {
    const formattedMessages = selectedMessages
      .map(msg => {
        const displayName = msg.role === 'user' 
          ? (msg.userName || currentUserName || 'Unknown User')
          : (msg.role === 'assistant' ? 'Assistant' : 'System');
        return `${displayName}: ${msg.content}`;
      })
      .join('\n\n');
    
    if (canShare) {
      navigator.share({
        title: 'Shared Chat Messages',
        text: formattedMessages,
      });
    }
  };

  const handleShareWithCollaborator = async (collaborator: Collaborator) => {
    // Here you would implement the actual sharing logic
    // For now, we'll just show a success message
    toast.success(`Shared messages with ${collaborator.username}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Share Chat</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={24} />
          </button>
        </div>
        
        <div className="mb-4 max-h-60 overflow-y-auto">
          {selectedMessages.map((message, index) => (
            <div key={message.id} className="mb-2">
              <div className="font-medium">
                {message.role === 'user' 
                  ? (message.userName || currentUserName || 'Unknown User')
                  : (message.role === 'assistant' ? 'Assistant' : 'System')}:
              </div>
              <div className="text-gray-700">{message.content}</div>
            </div>
          ))}
        </div>

        {/* Collaborators Section */}
        {collaborators.length > 0 && (
          <div className="mb-4 border-t pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Share with Collaborators</h3>
            <div className="space-y-2">
              {collaborators.map((collaborator) => (
                <button
                  key={collaborator.userId}
                  onClick={() => handleShareWithCollaborator(collaborator)}
                  className="w-full px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-left flex items-center space-x-2 transition-colors"
                >
                  <FiUsers className="text-gray-500" />
                  <span>{collaborator.username}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 border-t pt-4">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center"
          >
            <FiCopy className="mr-2" />
            Copy
          </button>
          {canShare && (
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center"
            >
              <FiShare2 className="mr-2" />
              Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareChatModal; 