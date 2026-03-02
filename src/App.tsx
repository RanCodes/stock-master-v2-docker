import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Package, 
  List, 
  Settings as SettingsIcon, 
  Plus, 
  Download, 
  Lock, 
  Unlock, 
  Trash2, 
  ChevronRight,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, AppConfig } from './types';

// --- Components ---

const CameraCapture = ({ onCapture, label }: { onCapture: (blob: Blob) => void, label: string }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const openGalleryPicker = () => {
    galleryInputRef.current?.click();
  };

  useEffect(() => {
    if (!showCamera || !stream || !videoRef.current) return;

    videoRef.current.srcObject = stream;
    videoRef.current.play().catch((error) => {
      console.error('Error playing camera stream', error);
      setCameraError('No se pudo iniciar la vista previa de cámara. Probá con "Seleccionar de galería".');
      stopCamera();
    });
  }, [showCamera, stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [stream, preview]);

  const startCamera = async () => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('La cámara en vivo requiere HTTPS en celular. Usa "Seleccionar imagen" para tomar la foto.');
      openFilePicker();
      return;
    }

    const constraints: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: 'environment' } }, audio: false },
      { video: true, audio: false }
    ];

    for (const constraint of constraints) {
      try {
        const s = await navigator.mediaDevices.getUserMedia(constraint);
        setCameraError(null);
        setStream(s);
        setShowCamera(true);
        return;
      } catch (err) {
        console.error('Error accessing camera with constraints:', constraint, err);
      }
    }

    setCameraError('No se pudo abrir la cámara en vivo. Usa "Seleccionar imagen" para continuar.');
  };

  const handleFileCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    onCapture(file);
    setCameraError(null);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(URL.createObjectURL(file));
    event.target.value = '';
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            onCapture(blob);
            setPreview(URL.createObjectURL(blob));
            stopCamera();
          }
        }, 'image/jpeg', 0.8);
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</label>
      <div className="relative aspect-video bg-zinc-100 rounded-xl border-2 border-dashed border-zinc-300 flex items-center justify-center overflow-hidden">
        {preview ? (
          <div className="relative w-full h-full">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <button 
              type="button"
              onClick={() => { setPreview(null); startCamera(); }}
              className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-zinc-400">
            <button 
              type="button"
              onClick={startCamera}
              className="flex flex-col items-center gap-2 hover:text-zinc-600 transition-colors"
            >
              <Camera size={32} />
              <span className="text-sm font-medium">Capturar Foto</span>
            </button>
            <button
              type="button"
              onClick={openFilePicker}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors"
            >
              Tomar con app de cámara
            </button>
            <button
              type="button"
              onClick={openGalleryPicker}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors"
            >
              Seleccionar de galería
            </button>
            {cameraError && (
              <p className="text-[11px] px-4 text-center text-amber-700">{cameraError}</p>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileCapture}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileCapture}
          className="hidden"
        />

        <AnimatePresence>
          {showCamera && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black flex flex-col"
            >
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="flex-1 object-cover"
              />
              <div className="p-8 flex justify-between items-center bg-zinc-900">
                <button type="button" onClick={stopCamera} className="text-white p-4">
                  <X size={32} />
                </button>
                <button 
                  type="button"
                  onClick={capture}
                  className="w-20 h-20 bg-white rounded-full border-4 border-zinc-400 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <div className="w-16 h-16 bg-white rounded-full border-2 border-zinc-900" />
                </button>
                <div className="w-16" /> {/* Spacer */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'form' | 'list' | 'settings'>('form');
  const [products, setProducts] = useState<Product[]>([]);
  const [config, setConfig] = useState<AppConfig>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [photoFront, setPhotoFront] = useState<Blob | null>(null);
  const [photoBack, setPhotoBack] = useState<Blob | null>(null);

  // SKU Conflict State
  const [skuConflict, setSkuConflict] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchConfig();
  }, []);

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data);
  };

  const fetchConfig = async () => {
    const res = await fetch('/api/config');
    const data = await res.json();
    setConfig({
      driveLink: data.driveLink || '',
      locked: data.locked === 'true'
    });
  };

  const handleSubmit = async (e: React.FormEvent, forceUpdate: boolean = false) => {
    if (e) e.preventDefault();
    
    // If not editing and SKU is provided, check for duplicates
    if (!editingId && sku && !forceUpdate) {
      const res = await fetch(`/api/products/sku/${sku}`);
      const existing = await res.json();
      if (existing) {
        setSkuConflict(existing);
        return;
      }
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('sku', sku);
    formData.append('name', name);
    formData.append('quantity', quantity);
    formData.append('notes', notes);
    if (photoFront) formData.append('photoFront', photoFront, 'front.jpg');
    if (photoBack) formData.append('photoBack', photoBack, 'back.jpg');
    if (forceUpdate) formData.append('updateExisting', 'true');

    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method: method,
        body: formData
      });
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        resetForm();
        fetchProducts();
        if (editingId) setView('list');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setSkuConflict(null);
    }
  };

  const resetForm = () => {
    setSku('');
    setName('');
    setQuantity('1');
    setNotes('');
    setPhotoFront(null);
    setPhotoBack(null);
    setEditingId(null);
  };

  const handleEdit = (product: Product) => {
    if (confirm('¿Deseas modificar los datos de este producto?')) {
      setEditingId(product.id);
      setSku(product.sku || '');
      setName(product.name || '');
      setQuantity(product.quantity.toString());
      setNotes(product.notes || '');
      setView('form');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿ESTÁS SEGURO de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
      await fetch(`/api/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    }
  };

  const saveConfig = async (newConfig: AppConfig) => {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig)
    });
    setConfig(newConfig);
  };

  const handleExport = () => {
    window.open('/api/export', '_blank');
  };

  const handleDbDownload = () => {
    window.open('/api/export/db', '_blank');
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-zinc-900 text-white p-1.5 rounded-lg">
            <Package size={20} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">StockMaster</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
          >
            <Download size={16} />
            <span>CSV</span>
          </button>
          <button
            onClick={handleDbDownload}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
          >
            <Download size={16} />
            <span>BD</span>
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {view === 'form' && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">
                  {editingId ? 'Modificar Producto' : 'Recepción de Stock'}
                </h2>
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 text-emerald-600 font-medium text-sm"
                  >
                    <CheckCircle2 size={16} />
                    Guardado
                  </motion.div>
                )}
              </div>

              <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <CameraCapture label="Foto Frente" onCapture={setPhotoFront} />
                  <CameraCapture label="Foto Reverso" onCapture={setPhotoBack} />
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">SKU / Código</label>
                    <input 
                      type="text" 
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Ej: PROD-123"
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nombre del Producto</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej: Caja de Herramientas"
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Cantidad</label>
                    <input 
                      type="number" 
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Anotaciones / Detalles</label>
                    <textarea 
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Detalles adicionales..."
                      className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  {editingId && (
                    <button 
                      type="button"
                      onClick={resetForm}
                      className="flex-1 bg-zinc-100 text-zinc-600 font-bold py-4 rounded-xl active:scale-[0.98] transition-all"
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-zinc-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-zinc-900/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {editingId ? <CheckCircle2 size={20} /> : <Plus size={20} />}
                        {editingId ? 'Guardar Cambios' : 'Registrar Producto'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {view === 'list' && (
            <motion.div 
              key="list"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold">Historial de Carga</h2>
              
              <div className="space-y-4">
                {products.length === 0 ? (
                  <div className="text-center py-12 text-zinc-400">
                    <Package size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No hay productos registrados aún.</p>
                  </div>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm group">
                      <div className="flex gap-4 p-4">
                        <div className="w-20 h-20 bg-zinc-100 rounded-lg overflow-hidden flex-shrink-0">
                          {product.photo_front ? (
                            <img src={product.photo_front} alt="Front" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                              <Camera size={24} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold truncate">{product.name || 'Sin Nombre'}</h3>
                            <span className="text-xs font-mono bg-zinc-100 px-2 py-0.5 rounded text-zinc-500">
                              x{product.quantity}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-500 font-mono mt-1">{product.sku || 'Sin SKU'}</p>
                          <p className="text-xs text-zinc-400 mt-2 line-clamp-1 italic">{product.notes}</p>
                        </div>
                      </div>
                      <div className="flex border-t border-zinc-100">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <SettingsIcon size={14} />
                          Modificar
                        </button>
                        <div className="w-px bg-zinc-100" />
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <h2 className="text-2xl font-bold">Configuración</h2>

              <div className="space-y-6">
                <div className="bg-white border border-zinc-200 rounded-2xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-900">
                      <Lock size={18} className={config.locked ? "text-zinc-900" : "text-zinc-300"} />
                      <h3 className="font-bold">Google Drive Backup</h3>
                    </div>
                    <button 
                      onClick={() => saveConfig({ ...config, locked: !config.locked })}
                      className={`p-2 rounded-full transition-colors ${config.locked ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-900 text-white'}`}
                    >
                      {config.locked ? <Unlock size={16} /> : <Lock size={16} />}
                    </button>
                  </div>

                  <p className="text-sm text-zinc-500">
                    Configura el link de la carpeta de Google Drive donde se respaldarán las imágenes.
                  </p>

                  <div className="space-y-2">
                    <input 
                      type="text" 
                      disabled={config.locked}
                      value={config.driveLink}
                      onChange={(e) => setConfig({ ...config, driveLink: e.target.value })}
                      placeholder="https://drive.google.com/drive/folders/..."
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:outline-none disabled:opacity-50"
                    />
                    {!config.locked && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => saveConfig({ ...config, driveLink: config.driveLink })}
                          className="flex-1 bg-zinc-900 text-white text-sm font-bold py-2.5 rounded-lg"
                        >
                          Guardar Link
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('¿Borrar link de carpeta?')) {
                              saveConfig({ ...config, driveLink: '' });
                            }
                          }}
                          className="p-2.5 text-red-500 border border-red-100 rounded-lg hover:bg-red-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex gap-4">
                  <AlertCircle className="text-amber-600 shrink-0" size={24} />
                  <div className="space-y-1">
                    <h4 className="font-bold text-amber-900 text-sm">Nota sobre Backup</h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Asegúrate de que el link de Google Drive tenga permisos de <strong>"Cualquier persona con el enlace puede editar"</strong> para permitir la carga automática desde esta aplicación.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* SKU Conflict Modal */}
      <AnimatePresence>
        {skuConflict && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">SKU Duplicado</h3>
                <p className="text-zinc-500 text-sm">
                  El código <strong>{skuConflict.sku}</strong> ya existe para el producto <strong>{skuConflict.name}</strong>.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleSubmit(null as any, true)}
                  className="w-full bg-zinc-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-zinc-900/20 active:scale-[0.98] transition-all"
                >
                  Sumar al Stock Existente
                </button>
                <button 
                  onClick={() => setSkuConflict(null)}
                  className="w-full bg-zinc-100 text-zinc-600 font-bold py-4 rounded-xl active:scale-[0.98] transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-zinc-200 px-6 py-3 z-40">
        <div className="max-w-xl mx-auto flex justify-around items-center">
          <button 
            onClick={() => { resetForm(); setView('form'); }}
            className={`flex flex-col items-center gap-1 transition-colors ${view === 'form' ? 'text-zinc-900' : 'text-zinc-400'}`}
          >
            <Plus size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Carga</span>
          </button>
          <button 
            onClick={() => setView('list')}
            className={`flex flex-col items-center gap-1 transition-colors ${view === 'list' ? 'text-zinc-900' : 'text-zinc-400'}`}
          >
            <List size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Historial</span>
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`flex flex-col items-center gap-1 transition-colors ${view === 'settings' ? 'text-zinc-900' : 'text-zinc-400'}`}
          >
            <SettingsIcon size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Ajustes</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
