'use client';
import React, { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { eventsApi } from '@/lib/api';
import { toast } from 'sonner';
import { Ticket, Plus, Edit2, X, Loader2, Calendar, MapPin, Users, Eye, Ban, ImagePlus, ChevronLeft, ChevronRight, Tag } from 'lucide-react';

const INIT = { title:'', description:'', date:'', endDate:'', location:'', address:'', city:'', capacity:50, ticketPrice:100, category:'dining', bundleDiscount:0 };
const STATUS_BADGE: Record<string,string> = { draft:'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300', published:'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400', cancelled:'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' };

function ImageCarousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!images?.length) return (
    <div className="w-full h-44 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 rounded-t-xl flex items-center justify-center">
      <Ticket className="w-10 h-10 text-slate-300 dark:text-slate-600" />
    </div>
  );
  return (
    <div className="relative w-full h-44 bg-black rounded-t-xl overflow-hidden group">
      <img src={images[idx]} alt="" className="w-full h-full object-cover" />
      {images.length > 1 && (<>
        <button onClick={() => setIdx(i => (i-1+images.length)%images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronLeft className="w-4 h-4" /></button>
        <button onClick={() => setIdx(i => (i+1)%images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight className="w-4 h-4" /></button>
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
          {images.map((_,i) => (<button key={i} onClick={() => setIdx(i)} className={`w-1.5 h-1.5 rounded-full ${i===idx?'bg-white':'bg-white/50'}`} />))}
        </div>
      </>)}
      <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">{images.length} photo{images.length>1?'s':''}</div>
    </div>
  );
}

function ImageUploadZone({ images, onAdd, onRemove, uploading }: { images:string[]; onAdd:(f:FileList)=>void; onRemove:(i:number)=>void; uploading:boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Event Images</label>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {images.map((url,i) => (
          <div key={i} className="relative group aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => onRemove(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"><X className="w-3 h-3" /></button>
          </div>
        ))}
        {images.length < 5 && (
          <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
            className="aspect-video rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center gap-1 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-50">
            {uploading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <><ImagePlus className="w-5 h-5 text-slate-400" /><span className="text-xs text-slate-400">Add</span></>}
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400">Up to 5 images. JPG, PNG, WEBP.</p>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && onAdd(e.target.files)} />
    </div>
  );
}

export default function EventsPage() {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(INIT);
  const [images, setImages] = useState<string[]>([]);
  const [imgUploading, setImgUploading] = useState(false);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['v-events'], queryFn: () => eventsApi.getAll() });
  const events = data?.data || [];
  const close = () => { setModal(false); setEditing(null); setForm(INIT); setImages([]); };
  const createM = useMutation({ mutationFn: (d:any) => eventsApi.create(d), onSuccess:()=>{ toast.success('Created!'); qc.invalidateQueries({queryKey:['v-events']}); close(); }});
  const updateM = useMutation({ mutationFn: ({id,d}:{id:string;d:any}) => eventsApi.update(id,d), onSuccess:()=>{ toast.success('Updated!'); qc.invalidateQueries({queryKey:['v-events']}); close(); }});
  const pubM = useMutation({ mutationFn: (id:string) => eventsApi.publish(id), onSuccess:()=>{ toast.success('Published!'); qc.invalidateQueries({queryKey:['v-events']}); }});
  const canM = useMutation({ mutationFn: (id:string) => eventsApi.cancel(id), onSuccess:()=>{ toast.success('Cancelled'); qc.invalidateQueries({queryKey:['v-events']}); }});
  const submit = (e:React.FormEvent) => { e.preventDefault(); const payload = { ...form, images }; editing ? updateM.mutate({id:editing.id,d:payload}) : createM.mutate(payload); };
  const edit = (ev:any) => { setEditing(ev); setForm({title:ev.title||'',description:ev.description||'',date:ev.date?new Date(ev.date).toISOString().slice(0,16):'',endDate:ev.endDate?new Date(ev.endDate).toISOString().slice(0,16):'',location:ev.location||'',address:ev.address||'',city:ev.city||'',capacity:ev.capacity||50,ticketPrice:ev.ticketPrice||100,category:ev.category||'dining',bundleDiscount:ev.bundleDiscount||0}); setImages(ev.images||[]); setModal(true); };
  const handleImageAdd = useCallback(async (files: FileList) => {
    const remaining = 5 - images.length;
    const toProcess = Array.from(files).slice(0, remaining);
    if (!toProcess.length) return;
    setImgUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of toProcess) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => { reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file); });
        const url = await eventsApi.uploadImage(base64, file.name);
        uploaded.push(url);
      }
      setImages(prev => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} image${uploaded.length>1?'s':''} uploaded`);
    } catch { toast.error('Image upload failed'); } finally { setImgUploading(false); }
  }, [images.length]);
  const handleImageRemove = (idx: number) => setImages(prev => prev.filter((_,i) => i !== idx));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Events</h1><p className="text-gray-500 mt-1">Create and manage events</p></div>
        <Button onClick={()=>{setForm(INIT);setImages([]);setEditing(null);setModal(true);}} className="gap-2"><Plus className="w-4 h-4"/>Create Event</Button>
      </div>
      {isLoading ? <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary"/></div> : events.length===0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
          <Ticket className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4"/>
          <h3 className="text-lg font-medium text-slate-900 dark:text-white">No events yet</h3>
          <p className="text-slate-500 mt-1 mb-6">Host your first event and sell tickets</p>
          <Button onClick={()=>{setForm(INIT);setImages([]);setModal(true);}} className="gap-2"><Plus className="w-4 h-4"/>Create Event</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{events.map((ev:any)=>(
          <div key={ev.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
            <ImageCarousel images={ev.images||[]} />
            <div className="p-4 flex-1 flex flex-col">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-semibold text-slate-900 dark:text-white leading-snug">{ev.title}</h3>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[ev.status]||STATUS_BADGE.draft}`}>{ev.status}</span>
              </div>
              <div className="space-y-1.5 text-sm text-slate-500 dark:text-slate-400 mb-4 flex-1">
                <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 shrink-0"/>{new Date(ev.date).toLocaleDateString('en-NG',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
                <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0"/><span className="truncate">{ev.location}{ev.city?`, ${ev.city}`:''}</span></div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5"/>{ev._count?.tickets||0}/{ev.capacity}</span>
                  <span className="flex items-center gap-1 font-medium text-primary-600 dark:text-primary-400"><Tag className="w-3 h-3"/>{ev.ticketPrice} cr</span>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                {ev.status==='draft'&&<Button size="sm" variant="outline" className="flex-1 gap-1" onClick={()=>pubM.mutate(ev.id)} disabled={pubM.isPending}>{pubM.isPending?<Loader2 className="w-3 h-3 animate-spin"/>:<Eye className="w-3 h-3"/>}Publish</Button>}
                {ev.status!=='cancelled'&&<><Button size="sm" variant="outline" className="flex-1 gap-1" onClick={()=>edit(ev)}><Edit2 className="w-3 h-3"/>Edit</Button><Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20 gap-1" onClick={()=>{if(confirm('Cancel event?'))canM.mutate(ev.id)}}><Ban className="w-3 h-3"/></Button></>}
              </div>
            </div>
          </div>
        ))}</div>
      )}
      {modal&&(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&close()}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{editing?'Edit':'Create New'} Event</h2>
              <button onClick={close} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-5">
              <ImageUploadZone images={images} onAdd={handleImageAdd} onRemove={handleImageRemove} uploading={imgUploading} />
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
                <div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Title *</label><Input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Valentine's Dinner Experience" required/></div>
                <div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={3} placeholder="Describe what guests can expect..." className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm"/></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Start *</label><Input type="datetime-local" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} required/></div><div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">End</label><Input type="datetime-local" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></div></div>
                <div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Venue / Location *</label><Input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="The Grand Hall, Victoria Island" required/></div>
                <div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Address</label><Input value={form.address} onChange={e=>setForm({...form,address:e.target.value})} placeholder="42A Admiralty Way"/></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">City</label><Input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Lagos"/></div><div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"><option value="dining">Dining</option><option value="concert">Concert</option><option value="wedding">Wedding</option><option value="corporate">Corporate</option><option value="festival">Festival</option><option value="other">Other</option></select></div></div>
                <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Capacity *</label><Input type="number" value={form.capacity} onChange={e=>setForm({...form,capacity:+e.target.value})} min={1} required/></div><div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Price (credits)</label><Input type="number" value={form.ticketPrice} onChange={e=>setForm({...form,ticketPrice:+e.target.value})} min={0} required/></div><div><label className="block text-sm font-medium mb-1.5 text-slate-700 dark:text-slate-300">Bundle Discount %</label><Input type="number" value={form.bundleDiscount} onChange={e=>setForm({...form,bundleDiscount:+e.target.value})} min={0} max={50}/></div></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={createM.isPending||updateM.isPending||imgUploading}>{(createM.isPending||updateM.isPending)?<Loader2 className="w-4 h-4 animate-spin mr-2"/>:null}{editing?'Update':'Create'}</Button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
