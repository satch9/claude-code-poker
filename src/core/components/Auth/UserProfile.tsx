import React, { useState, useRef } from "react";
import { Button } from "../UI/Button";
import { useAuth } from "../../hooks/useAuth";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

interface UserProfileProps {
  showLogout?: boolean;
  compact?: boolean;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  showLogout = true,
  compact = false,
}) => {
  const { user, logout, updateUser } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.name?.charAt(0).toUpperCase() || '');
  const [uploadedImageId, setUploadedImageId] = useState(user?.avatarImageId || null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mutations
  const updateProfile = useMutation(api.users.updateUserProfile);
  const generateUploadUrl = useMutation(api.users.generateAvatarUploadUrl);
  
  // Query for avatar image URL
  const avatarImageUrl = useQuery(
    api.users.getAvatarImageUrl,
    uploadedImageId ? { imageId: uploadedImageId } : "skip"
  );
  
  // Query for user's current avatar URL
  const userAvatarUrl = useQuery(
    api.users.getAvatarImageUrl,
    user?.avatarImageId ? { imageId: user.avatarImageId } : "skip"
  );

  // Query for user statistics
  const userStats = useQuery(
    api.users.getUserStats,
    user ? { userId: user._id } : "skip"
  );

  // Query for user ranking
  const userRanking = useQuery(
    api.users.getUserRanking,
    user ? { userId: user._id } : "skip"
  );

  // Avatars disponibles (couleurs et initiales)
  const avatarColors = [
    'bg-poker-green-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];

  const [selectedAvatarColor, setSelectedAvatarColor] = useState(user?.avatarColor || avatarColors[0]);

  const handleSave = async () => {
    if (!editedName.trim() || !user) return;
    
    setIsSaving(true);
    try {
      const updatedUser = await updateProfile({
        userId: user._id,
        name: editedName,
        avatarColor: selectedAvatarColor,
        avatarImageId: uploadedImageId || undefined,
      });
      
      // Update local user state
      if (updatedUser) {
        updateUser({
          name: updatedUser.name,
          avatarColor: updatedUser.avatarColor,
          avatarImageId: updatedUser.avatarImageId,
        });
      }
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      
      // Show user-friendly error message
      if (error instanceof Error) {
        alert(`Erreur lors de la sauvegarde: ${error.message}`);
      } else {
        alert('Erreur lors de la sauvegarde du profil');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedName(user?.name || '');
    setSelectedAvatar(user?.name?.charAt(0).toUpperCase() || '');
    setSelectedAvatarColor(user?.avatarColor || avatarColors[0]);
    setUploadedImageId(user?.avatarImageId || null);
    setIsEditing(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('L\'image doit faire moins de 5MB');
      return;
    }

    try {
      // Generate upload URL
      const uploadUrl = await generateUploadUrl({ userId: user._id });
      
      // Upload file
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!result.ok) {
        throw new Error('Upload failed');
      }

      const { storageId } = await result.json();
      setUploadedImageId(storageId);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erreur lors du téléchargement de l\'image');
    }
  };

  const handleRemoveImage = async () => {
    if (uploadedImageId && user) {
      try {
        await updateProfile({ userId: user._id, removeAvatarImage: true });
        setUploadedImageId(null);
      } catch (error) {
        console.error('Error removing image:', error);
      }
    }
  };

  if (!user) return null;

  // Les chips sont maintenant gérées par table, pas par utilisateur

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowDialog(true)}
          className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-gray-50"
        >
          <div className={`w-8 h-8 ${user.avatarColor || 'bg-poker-green-500'} rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden`}>
            {userAvatarUrl ? (
              <img 
                src={userAvatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              user.name?.charAt(0).toUpperCase() || '?'
            )}
          </div>
          <div>
            <div className="font-medium text-sm text-gray-900">{user.name || 'Utilisateur'}</div>
            <div className="text-xs text-gray-500">Joueur en ligne</div>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dialog modal */}
        {showDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowDialog(false)}
            />

            {/* Modal content */}
            <div className="relative bg-white rounded-2xl p-6 shadow-2xl border border-gray-200 w-full max-w-md mx-auto my-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditing ? 'Modifier le profil' : 'Mon Profil'}
                </h3>
                <div className="flex items-center gap-2">
                  {!isEditing && user && (
                    <button
                      onClick={() => {
                        console.log('Opening edit mode for user:', user._id);
                        setIsEditing(true);
                      }}
                      className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                      title="Modifier le profil"
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => setShowDialog(false)}
                    className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* User info */}
              <div className="flex items-center gap-4 mb-6">
                <div className="relative">
                  <div className={`w-16 h-16 ${selectedAvatarColor} rounded-full flex items-center justify-center text-white font-bold text-2xl overflow-hidden`}>
                    {avatarImageUrl ? (
                      <img 
                        src={avatarImageUrl} 
                        alt="Avatar" 
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      selectedAvatar
                    )}
                  </div>
                  {isEditing && (
                    <div className="absolute -bottom-1 -right-1 flex gap-1">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-6 h-6 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors"
                        title="Télécharger une image"
                      >
                        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                      {avatarImageUrl && (
                        <button
                          onClick={handleRemoveImage}
                          className="w-6 h-6 bg-red-500 border-2 border-red-600 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                          title="Supprimer l'image"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="w-full text-lg font-semibold text-gray-900 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-poker-green-500 focus:border-transparent"
                      placeholder="Votre nom"
                    />
                  ) : (
                    <h4 className="text-lg font-semibold text-gray-900">{user.name || 'Utilisateur'}</h4>
                  )}
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">En ligne</span>
                  </div>
                </div>
              </div>

              {/* Avatar color selector (only in edit mode) */}
              {isEditing && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Couleur de l'avatar
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {avatarColors.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedAvatarColor(color)}
                        className={`w-8 h-8 ${color} rounded-full flex items-center justify-center text-white font-bold text-sm transition-all ${
                          selectedAvatarColor === color
                            ? 'ring-2 ring-offset-2 ring-poker-green-500 scale-110'
                            : 'hover:scale-105'
                        }`}
                      >
                        {selectedAvatar}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-poker-green-600">
                    {userStats?.gamesWon || 0}
                  </div>
                  <div className="text-xs text-gray-500">Parties gagnées</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {userStats?.gamesPlayed || 0}
                  </div>
                  <div className="text-xs text-gray-500">Parties jouées</div>
                </div>
              </div>

              {/* Detailed Stats */}
              {userStats && userStats.gamesPlayed > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Statistiques détaillées</h4>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="font-bold text-blue-600">{userStats.winRate}%</div>
                        <div className="text-blue-500">Taux victoire</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="font-bold text-green-600">{userStats.totalWinnings}</div>
                        <div className="text-green-500">Jetons gagnés</div>
                      </div>
                      <div className="text-center p-2 bg-purple-50 rounded">
                        <div className="font-bold text-purple-600">{userStats.handsPlayed}</div>
                        <div className="text-purple-500">Mains jouées</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <div className="font-bold text-orange-600">{userStats.biggestWin}</div>
                        <div className="text-orange-500">Plus gros gain</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded">
                        <div className="font-bold text-red-600">{userStats.tournamentWins}</div>
                        <div className="text-red-500">Tournois gagnés</div>
                      </div>
                    </div>

                    {/* Style de jeu */}
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-xs font-medium text-gray-700 mb-2">Style de jeu</div>
                      <div className="text-xs text-gray-600">
                        Action favorite: <span className="font-bold capitalize">{userStats.mostFrequentAction}</span>
                      </div>
                      {userStats.currentWinStreak > 0 && (
                        <div className="text-xs text-green-600 mt-1">
                          🔥 Série de {userStats.currentWinStreak} victoire{userStats.currentWinStreak > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Ranking */}
              {userRanking && userRanking.totalPlayers > 1 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Classement</h4>
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-3 rounded-lg border border-yellow-200">
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-600">
                        #{userRanking.userRank}
                      </div>
                      <div className="text-xs text-orange-500">
                        sur {userRanking.totalPlayers} joueurs
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Account info */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Membre depuis</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Dernière connexion</span>
                  <span className="text-sm font-medium text-gray-900">
                    {user.lastSeen ? new Date(user.lastSeen).toLocaleString() : "Maintenant"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                {isEditing ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      className="flex-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSave}
                      className="flex-1"
                      disabled={!editedName.trim() || isSaving}
                    >
                      {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDialog(false)}
                      className="flex-1"
                    >
                      Fermer
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        logout();
                        setShowDialog(false);
                      }}
                      className="flex-1"
                    >
                      Se déconnecter
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-poker-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {user.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{user.name || 'Utilisateur'}</h3>
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
