import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Map } from 'lucide-react';
import { AppConfig } from '../types';
import { Button } from './Button';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [tempConfig, setTempConfig] = useState<AppConfig>(config);

  useEffect(() => {
    setTempConfig(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-700">
            <Settings className="w-5 h-5" />
            <h2 className="font-bold text-lg">Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telegram Bot Token</label>
            <input
              type="text"
              value={tempConfig.telegramBotToken}
              onChange={(e) => setTempConfig(prev => ({ ...prev, telegramBotToken: e.target.value }))}
              placeholder="123456:ABC..."
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Chat ID</label>
            <input
              type="text"
              value={tempConfig.telegramChatId}
              onChange={(e) => setTempConfig(prev => ({ ...prev, telegramChatId: e.target.value }))}
              placeholder="-100..."
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold">
              <Map className="w-4 h-4" />
              <h3>Google Maps (Optional)</h3>
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
            <input
              type="text"
              value={tempConfig.googleMapsApiKey || ''}
              onChange={(e) => setTempConfig(prev => ({ ...prev, googleMapsApiKey: e.target.value }))}
              placeholder="AIzaSy..."
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
            <p className="text-xs text-slate-500 mt-1">
              Required for Satellite Image generation. Enable <strong>Static Maps API</strong> in Google Cloud Console.
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <Button variant="outline" fullWidth onClick={onClose}>Cancel</Button>
          <Button 
            variant="primary" 
            fullWidth 
            onClick={() => {
              onSave(tempConfig);
              onClose();
            }}
            icon={<Save className="w-4 h-4" />}
          >
            Save Config
          </Button>
        </div>
      </div>
    </div>
  );
};
