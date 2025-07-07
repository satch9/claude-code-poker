import React from "react";
import { Button } from "../UI/Button";
import { ChipStack } from "../UI/Chip";
import { useAuth } from "../../hooks/useAuth";

interface UserProfileProps {
  showLogout?: boolean;
  compact?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  showLogout = true,
  compact = false,
}) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  // Les chips sont maintenant gérées par table, pas par utilisateur

  if (compact) {
    return (
      <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 shadow-sm">
        <div className="w-8 h-8 bg-poker-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-medium text-sm text-gray-900">{user.name}</div>
          <div className="text-xs text-gray-500">
            Joueur en ligne
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-poker-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Statut</h4>
          <div className="flex items-center gap-4">
            <div className="text-lg font-bold text-poker-green-600">
              Joueur actif
            </div>
            <div className="text-sm text-gray-500">
              Les chips sont gérées par table
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex flex-row gap-2 justify-between">
              <span className="text-gray-500">Member since:</span>
              <div className="font-medium">
                {new Date(user.createdAt).toLocaleDateString()}
              </div>

              <span className="text-gray-500">Last seen:</span>
              <div className="font-medium">
                {user.lastSeen
                  ? new Date(user.lastSeen).toLocaleString()
                  : "Now"}
              </div>
            </div>
            {showLogout && (
              <div className="self-center sm:self-auto">
                <Button variant="ghost" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
