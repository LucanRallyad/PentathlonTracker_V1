'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { SuperAdminGuard } from '@/components/SuperAdminGuard';
import {
  UserCog, Shield, ShieldAlert, Lock, Unlock, LogOut, KeyRound,
  Trash2, ChevronDown, ChevronUp, Search, Edit3, Check, X, Save,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700 border-red-200',
  admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  official: 'bg-blue-100 text-blue-700 border-blue-200',
  athlete: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const VALID_ROLES = ['super_admin', 'admin', 'official', 'athlete'];

interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  passwordChangedAt: string | null;
  forcePasswordChange: boolean;
  activeSessions: number;
  lastActive: string;
  isLocked: boolean;
  accountLockout: {
    failedAttempts: number;
    lockoutUntil: string | null;
    escalationLevel: number;
  } | null;
}

export default function AccountManagement() {
  const { data: users, mutate, isLoading } = useSWR<UserAccount[]>('/api/super-admin/accounts', fetcher);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [editingField, setEditingField] = useState<{ userId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const filteredUsers = users?.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

  const performAction = async (userId: string, action: string, value?: string) => {
    setActionMessage('');
    const res = await fetch('/api/super-admin/accounts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, value }),
    });
    const data = await res.json();
    if (res.ok) {
      setActionMessage(data.message);
      mutate();
    } else {
      setActionMessage(`Error: ${data.error}`);
    }
    setTimeout(() => setActionMessage(''), 3000);
  };

  const deleteUser = async (userId: string, name: string) => {
    if (!confirm(`Permanently delete user "${name}"? This cannot be undone.`)) return;
    setActionMessage('');
    const res = await fetch('/api/super-admin/accounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (res.ok) {
      setActionMessage(data.message);
      mutate();
    } else {
      setActionMessage(`Error: ${data.error}`);
    }
    setTimeout(() => setActionMessage(''), 3000);
  };

  const startEditing = (userId: string, field: string, currentValue: string) => {
    setEditingField({ userId, field });
    setEditValue(currentValue);
  };

  const saveEdit = async (userId: string, field: string) => {
    const action = field === 'name' ? 'changeName' : 'changeEmail';
    await performAction(userId, action, editValue);
    setEditingField(null);
    setEditValue('');
  };

  return (
    <SuperAdminGuard>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <UserCog className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Account Management</h1>
            <p className="text-sm text-gray-500">{users?.length || 0} total accounts</p>
          </div>
        </div>

        {/* Action message */}
        {actionMessage && (
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
            actionMessage.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {actionMessage}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
          <div className="flex gap-2">
            {['all', ...VALID_ROLES].map(role => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition ${
                  roleFilter === role
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {role === 'all' ? 'All' : role.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* User List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map(user => {
              const isExpanded = expandedUser === user.id;
              return (
                <div key={user.id} className="bg-white border rounded-lg overflow-hidden">
                  {/* Main row */}
                  <div
                    className="px-4 py-3 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                      user.role === 'super_admin' ? 'bg-red-500' :
                      user.role === 'admin' ? 'bg-indigo-500' :
                      user.role === 'official' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Name & Email */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user.email}</div>
                    </div>

                    {/* Role badge */}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${ROLE_STYLES[user.role] || 'bg-gray-100 text-gray-700'}`}>
                      {user.role.replace('_', ' ')}
                    </span>

                    {/* Status indicators */}
                    <div className="flex items-center gap-2">
                      {user.isLocked && (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      )}
                      {user.activeSessions > 0 && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          {user.activeSessions} session{user.activeSessions > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* Expand icon */}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 px-4 py-4 space-y-4">
                      {/* Info Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoField label="User ID" value={user.id} />
                        <InfoField label="Created" value={new Date(user.createdAt).toLocaleDateString()} />
                        <InfoField label="Last Active" value={new Date(user.lastActive).toLocaleString()} />
                        <InfoField
                          label="Password Changed"
                          value={user.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleDateString() : 'Never'}
                        />
                      </div>

                      {/* Editable Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Name */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-500 w-12">Name</label>
                          {editingField?.userId === user.id && editingField?.field === 'name' ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="text"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="flex-1 px-2 py-1 border rounded text-sm"
                                onClick={e => e.stopPropagation()}
                              />
                              <button onClick={(e) => { e.stopPropagation(); saveEdit(user.id, 'name'); }}
                                className="p-1 text-green-600 hover:bg-green-50 rounded">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingField(null); }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-sm text-gray-900">{user.name}</span>
                              <button onClick={(e) => { e.stopPropagation(); startEditing(user.id, 'name', user.name); }}
                                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-500 w-12">Email</label>
                          {editingField?.userId === user.id && editingField?.field === 'email' ? (
                            <div className="flex items-center gap-1 flex-1">
                              <input
                                type="email"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="flex-1 px-2 py-1 border rounded text-sm"
                                onClick={e => e.stopPropagation()}
                              />
                              <button onClick={(e) => { e.stopPropagation(); saveEdit(user.id, 'email'); }}
                                className="p-1 text-green-600 hover:bg-green-50 rounded">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setEditingField(null); }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-sm text-gray-900">{user.email}</span>
                              <button onClick={(e) => { e.stopPropagation(); startEditing(user.id, 'email', user.email); }}
                                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Role Selector */}
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-medium text-gray-500">Role</label>
                        <div className="flex gap-2">
                          {VALID_ROLES.map(role => (
                            <button
                              key={role}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (user.role !== role) {
                                  if (confirm(`Change ${user.name}'s role to "${role.replace('_', ' ')}"?`)) {
                                    performAction(user.id, 'changeRole', role);
                                  }
                                }
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition border ${
                                user.role === role
                                  ? ROLE_STYLES[role]
                                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {role.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Lockout Info */}
                      {user.accountLockout && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <div className="text-xs font-medium text-yellow-800 mb-1">Lockout Status</div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-yellow-700">
                            <span>Failed: {user.accountLockout.failedAttempts}</span>
                            <span>Level: {user.accountLockout.escalationLevel}</span>
                            <span>Until: {user.accountLockout.lockoutUntil ? new Date(user.accountLockout.lockoutUntil).toLocaleString() : 'Not locked'}</span>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <ActionButton
                          icon={<KeyRound className="w-3.5 h-3.5" />}
                          label="Force Password Change"
                          onClick={() => performAction(user.id, 'forcePasswordChange')}
                          color="text-amber-600 hover:bg-amber-50"
                        />
                        {user.isLocked ? (
                          <ActionButton
                            icon={<Unlock className="w-3.5 h-3.5" />}
                            label="Unlock Account"
                            onClick={() => performAction(user.id, 'unlock')}
                            color="text-green-600 hover:bg-green-50"
                          />
                        ) : (
                          <ActionButton
                            icon={<Lock className="w-3.5 h-3.5" />}
                            label="Disable Account"
                            onClick={() => {
                              if (confirm(`Disable ${user.name}'s account?`)) {
                                performAction(user.id, 'toggleActive', 'disable');
                              }
                            }}
                            color="text-orange-600 hover:bg-orange-50"
                          />
                        )}
                        <ActionButton
                          icon={<LogOut className="w-3.5 h-3.5" />}
                          label="Terminate Sessions"
                          onClick={() => {
                            if (confirm(`Terminate all sessions for ${user.name}?`)) {
                              performAction(user.id, 'terminateSessions');
                            }
                          }}
                          color="text-blue-600 hover:bg-blue-50"
                        />
                        <ActionButton
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          label="Delete Account"
                          onClick={() => deleteUser(user.id, user.name)}
                          color="text-red-600 hover:bg-red-50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {search || roleFilter !== 'all' ? 'No accounts match your filters' : 'No accounts found'}
              </div>
            )}
          </div>
        )}
      </div>
    </SuperAdminGuard>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-900 font-mono truncate">{value}</div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-transparent transition ${color}`}
    >
      {icon}
      {label}
    </button>
  );
}
