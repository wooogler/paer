          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {isMyChat ? "My Chat" : "Shared Chat"}
            </h2>
            <div className="flex items-center space-x-2">
              {isMyChat && (
                <>
                  <button
                    onClick={handleShareMessages}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Messages
                  </button>
                  <button
                    onClick={handleDeleteChat}
                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                    title="Delete Chat"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div> 