import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Camera, 
  Send, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  Cable, 
  ArrowRightLeft,
  X,
  Plus,
  Ruler,
  RefreshCw,
  MapPin,
  Target
} from 'lucide-react';
import { WorkType, WorkData, AppConfig } from './types';
import { ConfigModal } from './components/ConfigModal';
import { LocationCapture } from './components/LocationCapture';
import { Button } from './components/Button';
import { sendTelegramReport } from './services/telegramService';
import { calculateDistance } from './utils/geo';
import { generateSummaryImage } from './utils/imageGen';
import { generateKML } from './utils/kmlGen';
import { LocationPickerMap } from './components/LocationPickerMap';

const STORAGE_KEY_CONFIG = 'mt_app_config';

const DEFAULT_CONFIG: AppConfig = {
  telegramBotToken: '8014722410:AAEBYDTO2y-dz1Qb3sjOLMphvKq8H18K5_A',
  telegramChatId: '-1003023753695',
  googleMapsApiKey: '', 
};

const App: React.FC = () => {
  // Config State
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // App Flow State
  const [view, setView] = useState<'HOME' | 'PROCESS' | 'SUCCESS'>('HOME');
  const [workData, setWorkData] = useState<WorkData>({
    name: '',
    type: null,
    pointA: null,
    pointB: null,
    photos: [],
    distance: undefined,
  });

  // Map & Location State
  const [activeTarget, setActiveTarget] = useState<'A' | 'B'>('A');
  const [isManualDistance, setIsManualDistance] = useState(false);

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Load Config
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.telegramBotToken && parsed.telegramChatId) {
          setConfig(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.error("Failed to parse config", e);
      }
    }
  }, []);

  // Distance Calculation
  useEffect(() => {
    if (!isManualDistance && workData.pointA && workData.pointB) {
      const dist = calculateDistance(workData.pointA, workData.pointB);
      setWorkData(prev => ({ ...prev, distance: dist }));
    } else if (!workData.pointA || !workData.pointB) {
       if (!isManualDistance) setWorkData(prev => ({ ...prev, distance: undefined }));
    }
  }, [workData.pointA, workData.pointB, isManualDistance]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      photoPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [photoPreviews]);

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(newConfig));
  };

  const startProcess = (type: WorkType) => {
    if (!config.telegramBotToken || !config.telegramChatId) {
      alert("សូមកំណត់ Telegram ជាមុនសិន!"); // Please configure Telegram first
      setIsConfigOpen(true);
      return;
    }
    setWorkData({
      name: '',
      type,
      pointA: null,
      pointB: null,
      photos: [],
      distance: undefined
    });
    setPhotoPreviews([]);
    setErrorMsg(null);
    setIsManualDistance(false);
    setActiveTarget('A'); // Reset to Point A
    setView('PROCESS');
  };

  const handleLocationUpdate = (target: 'A' | 'B', lat: number, lng: number) => {
    const newLoc = {
      latitude: lat,
      longitude: lng,
      accuracy: 5,
      timestamp: Date.now()
    };

    setWorkData(prev => ({
      ...prev,
      [target === 'A' ? 'pointA' : 'pointB']: newLoc
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files) as File[];
      const newPreviews = newFiles.map(file => URL.createObjectURL(file));

      setWorkData(prev => ({ 
        ...prev, 
        photos: [...prev.photos, ...newFiles] 
      }));
      setPhotoPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removePhoto = (index: number) => {
    setWorkData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!workData.name) {
      setErrorMsg("សូមបញ្ចូលឈ្មោះការងារ។"); // Please enter a work name
      return;
    }
    if (!workData.pointA || !workData.pointB) {
      setErrorMsg("សូមចាប់យកចំណុចទីតាំងទាំងពីរ។"); // Please capture both points
      return;
    }
    if (workData.photos.length === 0) {
      setErrorMsg("សូមថតរូបយ៉ាងហោចណាស់មួយ។"); // Please take at least one photo
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const summaryImage = await generateSummaryImage(workData, config.googleMapsApiKey);
      const kmlFile = generateKML(workData);
      
      const dataToSend = {
        ...workData,
        photos: [summaryImage, ...workData.photos]
      };

      await sendTelegramReport(
        config.telegramBotToken, 
        config.telegramChatId, 
        dataToSend,
        kmlFile
      );
      
      setView('SUCCESS');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`បរាជ័យក្នុងការផ្ញើរបាយការណ៍: ${err.message}`); // Failed to send report
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHome = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-200 mb-6">
            <Cable className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">MT Field Tracker</h1>
          <p className="text-slate-500 text-lg max-w-xs mx-auto">ជ្រើសរើសវិសាលភាពការងារដើម្បីចាប់ផ្តើមកត់ត្រាទិន្នន័យ។</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={() => startProcess(WorkType.HAND_HOLE_TO_POLE)}
            className="w-full group relative overflow-hidden bg-white p-6 rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-500 transition-all duration-300 active:scale-95 text-left"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Cable className="w-24 h-24 text-blue-600 -rotate-12" />
            </div>
            <div className="relative z-10">
              <span className="inline-block p-2 bg-blue-100 rounded-lg text-blue-600 mb-3">
                <Cable className="w-6 h-6" />
              </span>
              <h3 className="text-xl font-bold text-slate-800">រន្ធដៃ ➡️ បង្គោល</h3>
              <p className="text-slate-500 mt-1">កត់ត្រាការតភ្ជាប់រវាងក្រោមដីនិងបង្គោល។</p>
            </div>
          </button>

          <button
            onClick={() => startProcess(WorkType.HAND_HOLE_TO_HAND_HOLE)}
            className="w-full group relative overflow-hidden bg-white p-6 rounded-2xl shadow-lg border-2 border-transparent hover:border-indigo-500 transition-all duration-300 active:scale-95 text-left"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <ArrowRightLeft className="w-24 h-24 text-indigo-600 -rotate-12" />
            </div>
            <div className="relative z-10">
              <span className="inline-block p-2 bg-indigo-100 rounded-lg text-indigo-600 mb-3">
                <ArrowRightLeft className="w-6 h-6" />
              </span>
              <h3 className="text-xl font-bold text-slate-800">រន្ធដៃ ➡️ រន្ធដៃ</h3>
              <p className="text-slate-500 mt-1">កត់ត្រាការតភ្ជាប់រវាងចំណុចក្រោមដីពីរ។</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  const renderProcess = () => (
    <div className="max-w-xl mx-auto pb-24 animate-in slide-in-from-right duration-300">
      <div className="bg-white sticky top-0 z-30 px-4 py-3 shadow-sm border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setView('HOME')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h2 className="font-bold text-slate-800 text-base leading-tight">របាយការណ៍ថ្មី</h2>
            <p className="text-xs text-slate-500 font-medium">{workData.type}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {/* Compact Distance Display in Header */}
           {workData.distance !== undefined && (
             <div className="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-bold text-slate-600">
                {workData.distance.toFixed(1)}m
             </div>
           )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Name Input */}
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ឈ្មោះការងារ / ID</label>
          <input
            type="text"
            value={workData.name}
            onChange={(e) => setWorkData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="ឧទាហរណ៍: Route A-123"
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
          />
        </div>

        {/* Embedded Map */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
             <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" /> 
                ផែនទីទីតាំង
             </label>
             <span className="text-xs text-slate-400">អូសផែនទីដើម្បីកំណត់ ចំណុច {activeTarget}</span>
          </div>
          
          <LocationPickerMap
            activeTarget={activeTarget}
            pointA={workData.pointA}
            pointB={workData.pointB}
            onLocationUpdate={handleLocationUpdate}
            onTargetChange={setActiveTarget}
          />
          
          {/* Point Selectors */}
          <div className="grid grid-cols-1 gap-3">
             <div className="relative">
                <LocationCapture 
                  label="ចំណុច A (ចាប់ផ្តើម)" 
                  value={workData.pointA} 
                  isActive={activeTarget === 'A'}
                  onActivate={() => setActiveTarget('A')}
                  color="blue"
                  icon={<span className="font-bold">A</span>}
                />
                 {/* Connection Line Visual between cards */}
                <div className="absolute left-7 -bottom-4 w-0.5 h-4 bg-slate-200 z-10"></div>
             </div>
             
             <LocationCapture 
                  label="ចំណុច B (បញ្ចប់)" 
                  value={workData.pointB} 
                  isActive={activeTarget === 'B'}
                  onActivate={() => setActiveTarget('B')}
                  color="indigo"
                  icon={<span className="font-bold">B</span>}
              />
          </div>
        </div>

        {/* Manual Distance Override (Optional) */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-500 font-medium">ចម្ងាយគណនា</span>
            <div className="flex items-center gap-2">
               <Ruler className="w-3 h-3 text-slate-400" />
               <input 
                 type="number" 
                 value={workData.distance !== undefined ? Math.round(workData.distance * 100) / 100 : ''}
                 onChange={(e) => {
                   setIsManualDistance(true);
                   const val = parseFloat(e.target.value);
                   setWorkData(prev => ({ ...prev, distance: isNaN(val) ? undefined : val }));
                 }}
                 placeholder="0.00"
                 className="bg-transparent text-right font-mono font-bold w-20 outline-none border-b border-slate-300 focus:border-blue-500"
               />
               <span className="text-xs text-slate-400">m</span>
               {isManualDistance && (
                 <button onClick={() => setIsManualDistance(false)} className="text-slate-400 hover:text-slate-600">
                   <RefreshCw className="w-3 h-3" />
                 </button>
               )}
            </div>
        </div>

        {/* Photo Upload */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
             <label className="block text-sm font-bold text-slate-700">រូបភាពការដ្ឋាន</label>
             <span className="text-xs text-slate-400">{workData.photos.length} រូប</span>
          </div>
          
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
            id="photo-upload"
          />
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photoPreviews.map((preview, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                <img src={preview} alt={`Work site ${index + 1}`} className="w-full h-full object-cover" />
                <button 
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-90 hover:bg-red-600 transition-all active:scale-95"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            <label 
              htmlFor="photo-upload" 
              className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all active:scale-95"
            >
              <div className="p-2 bg-blue-100 rounded-full mb-1">
                {photoPreviews.length > 0 ? <Plus className="w-5 h-5 text-blue-600" /> : <Camera className="w-5 h-5 text-blue-600" />}
              </div>
              <span className="text-xs font-medium text-slate-600 text-center px-1">
                {photoPreviews.length > 0 ? "បន្ថែម" : "ថតរូប"}
              </span>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm animate-in shake">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
        <div className="max-w-xl mx-auto">
          <Button 
            fullWidth 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            icon={isSubmitting ? undefined : <Send className="w-4 h-4" />}
          >
            {isSubmitting ? 'កំពុងផ្ញើ...' : 'បញ្ចប់ & ផ្ញើរបាយការណ៍'}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center animate-in zoom-in duration-300">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-12 h-12 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">របាយការណ៍បានផ្ញើ!</h2>
      <p className="text-slate-500 mb-8 max-w-xs">
        ទិន្នន័យការងារ រូបភាពផ្កាយរណប និងឯកសារ KML ត្រូវបានបង្ហោះដោយជោគជ័យ។
      </p>
      
      <div className="w-full max-w-xs space-y-3">
        <Button onClick={() => setView('HOME')} fullWidth>
          ត្រឡប់ទៅដើម
        </Button>
        <Button 
          variant="outline" 
          fullWidth 
          onClick={() => {
            // Restart same type
            startProcess(workData.type!);
          }}
        >
          ចាប់ផ្តើមការងារ {workData.type === WorkType.HAND_HOLE_TO_POLE ? 'បង្គោល' : 'រន្ធដៃ'} មួយទៀត
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      {/* Header (Only on Home) */}
      {view === 'HOME' && (
        <header className="p-4 flex justify-between items-center bg-white shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
              <span className="text-xs">MT</span>
            </div>
            <span>Field Tracker</span>
          </div>
          <button 
            onClick={() => setIsConfigOpen(true)}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </header>
      )}

      <main className="h-[calc(100vh-64px)] overflow-y-auto">
        {view === 'HOME' && renderHome()}
        {view === 'PROCESS' && renderProcess()}
        {view === 'SUCCESS' && renderSuccess()}
      </main>

      <ConfigModal 
        isOpen={isConfigOpen} 
        onClose={() => setIsConfigOpen(false)}
        config={config}
        onSave={handleSaveConfig}
      />
    </div>
  );
};

export default App;