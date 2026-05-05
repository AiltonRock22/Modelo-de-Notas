import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, PlusCircle, Settings, Trash2, 
  CheckCircle2, AlertTriangle, XCircle, FileText, 
  MessageSquare, Save, Cloud, Loader2, BookOpen, UserCheck, UserX, Award, Frown, Target, PieChart, RefreshCw
} from 'lucide-react';

// --- CONFIGURAÇÃO OFICIAL DO SEU FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBB1eD7H8ADJcben-Tj0Tecq8nFVSylYDg",
  authDomain: "noatas-3c8a0.firebaseapp.com",
  projectId: "noatas-3c8a0",
  storageBucket: "noatas-3c8a0.firebasestorage.app",
  messagingSenderId: "245916779117",
  appId: "1:245916779117:web:8bab27571f0e644fc37564",
  measurementId: "G-W5BEJRL29L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- CONFIGURAÇÕES BASE ---
const BEHAVIOR_TAGS = [
  { id: 'participativo', label: 'Participativo', icon: <UserCheck className="w-3 h-3"/>, color: 'bg-green-100 text-green-800 border-green-200' },
  { id: 'ajudante', label: 'Costuma Ajudar', icon: <Award className="w-3 h-3"/>, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'atentado', label: 'Atentado / Inquieto', icon: <AlertTriangle className="w-3 h-3"/>, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'faltoso', label: 'Faltoso', icon: <UserX className="w-3 h-3"/>, color: 'bg-slate-200 text-slate-700 border-slate-300' },
  { id: 'sai_sala', label: 'Sai muito da sala', icon: <BookOpen className="w-3 h-3"/>, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'desrespeitoso', label: 'Desrespeitoso', icon: <Frown className="w-3 h-3"/>, color: 'bg-red-100 text-red-800 border-red-200' },
];

const NOTEBOOK_STATUS = [
  { id: 'completo_bom', label: 'Completo e Bom', multiplier: 1, color: 'text-green-600 bg-green-50' },
  { id: 'completo_baguncado', label: 'Completo/Bagunçado', multiplier: 0.7, color: 'text-yellow-600 bg-yellow-50' },
  { id: 'incompleto', label: 'Incompleto', multiplier: 0.4, color: 'text-orange-600 bg-orange-50' },
  { id: 'nada', label: 'Não fez / Nada', multiplier: 0, color: 'text-red-600 bg-red-50' },
  { id: 'nao_avaliado', label: '-', multiplier: null, color: 'text-slate-400 bg-slate-50' }
];

export default function App() {
  // --- ESTADOS DO APLICATIVO ---
  const [classes, setClasses] = useState([{ id: 'turma1', name: '1º Ano A' }]);
  const [activeClassId, setActiveClassId] = useState('turma1');
  
  const [appData, setAppData] = useState({
    turma1: {
      config: { semesterMax: 20.0, provaMax: 10.0, notebookMax: 2.0, customColumns: [] },
      students: []
    }
  });

  // Estados de Controle de UI
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedNames, setPastedNames] = useState('');
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColMax, setNewColMax] = useState(5);
  const [activeBehaviorStudent, setActiveBehaviorStudent] = useState(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  // Estados do Banco de Dados e Salvamento
  const [user, setUser] = useState(null);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [authError, setAuthError] = useState('');

  // --- EFEITOS (FIREBASE) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch(e) {
        if (e.code === 'auth/configuration-not-found') {
          setAuthError("Atenção: Ative o provedor 'Anônimo' no painel do Firebase.");
        }
        setUser({ uid: 'usuario_offline_temporario' });
      }
    };
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAuthError('');
      }
    });
    initAuth();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.uid === 'usuario_offline_temporario') {
      setIsLoadingDB(false);
      return;
    }
    const fetchData = async () => {
      setIsLoadingDB(true);
      try {
        const docRef = doc(db, 'diarios_professores', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if(data.classes) setClasses(data.classes);
          if(data.appData) setAppData(data.appData);
        }
      } catch (error) {
        console.warn("Aviso ao carregar:", error);
      } finally {
        setIsLoadingDB(false);
      }
    };
    fetchData();
  }, [user]);

  // Função Manual de Salvamento
  const handleSaveToCloud = async () => {
    if (!user || user.uid === 'usuario_offline_temporario') return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'diarios_professores', user.uid), { 
        classes: classes,
        appData: appData,
        lastUpdated: new Date().toISOString()
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.warn("Erro ao salvar:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // --- FUNÇÕES DE MANIPULAÇÃO ---

  const notifyChange = (newData, newClasses = classes) => {
    setAppData(newData);
    setClasses(newClasses);
    setHasUnsavedChanges(true);
  };

  const handleConfigChange = (field, value) => {
    const newData = {
      ...appData,
      [activeClassId]: {
        ...appData[activeClassId],
        config: { ...appData[activeClassId].config, [field]: parseFloat(value) || 0 }
      }
    };
    notifyChange(newData);
  };

  const confirmAddClass = () => {
    if (!newClassName.trim()) return;
    const newId = 'turma_' + Date.now();
    const newClasses = [...classes, { id: newId, name: newClassName }];
    const newData = {
      ...appData,
      [newId]: { config: { semesterMax: 20.0, provaMax: 10.0, notebookMax: 2.0, customColumns: [] }, students: [] }
    };
    notifyChange(newData, newClasses);
    setActiveClassId(newId);
    setNewClassName('');
    setIsClassModalOpen(false);
  };

  const handleDeleteClass = () => {
    if (classes.length <= 1) {
      alert("Você precisa ter pelo menos uma turma no diário.");
      return;
    }
    const turmaAtual = classes.find(c => c.id === activeClassId);
    if (window.confirm(`ATENÇÃO! Tem certeza que deseja excluir a turma "${turmaAtual.name}" e TODAS as notas de seus alunos? Esta ação não pode ser desfeita.`)) {
      const newClasses = classes.filter(c => c.id !== activeClassId);
      const newData = { ...appData };
      delete newData[activeClassId];
      notifyChange(newData, newClasses);
      setActiveClassId(newClasses[0].id);
    }
  };

  const handlePasteStudents = () => {
    if (!pastedNames.trim()) return;
    const namesArray = pastedNames.split(/[\n,]+/).map(n => n.trim()).filter(n => n !== '');
    const newStudents = namesArray.map(name => ({
      id: 'std_' + Math.random().toString(36).substr(2, 9),
      name: name,
      prova: '',
      caderno: 'nao_avaliado',
      comportamentos: [],
      customScores: {} 
    }));
    const newData = {
      ...appData,
      [activeClassId]: {
        ...appData[activeClassId],
        students: [...appData[activeClassId].students, ...newStudents]
      }
    };
    notifyChange(newData);
    setPastedNames('');
    setIsPasteModalOpen(false);
  };

  const handleDeleteStudent = (studentId) => {
    const newData = {
      ...appData,
      [activeClassId]: {
        ...appData[activeClassId],
        students: appData[activeClassId].students.filter(s => s.id !== studentId)
      }
    };
    notifyChange(newData);
  };

  const handleUpdateStudent = (studentId, field, value) => {
    const newData = {
      ...appData,
      [activeClassId]: {
        ...appData[activeClassId],
        students: appData[activeClassId].students.map(s => s.id === studentId ? { ...s, [field]: value } : s)
      }
    };
    notifyChange(newData);
  };

  const handleUpdateCustomScore = (studentId, colId, value) => {
    const newData = {
      ...appData,
      [activeClassId]: {
        ...appData[activeClassId],
        students: appData[activeClassId].students.map(s => 
          s.id === studentId ? { ...s, customScores: { ...s.customScores, [colId]: value } } : s
        )
      }
    };
    notifyChange(newData);
  };

  const toggleBehavior = (studentId, behaviorId) => {
    const newData = {
      ...appData,
      [activeClassId]: {
        ...appData[activeClassId],
        students: appData[activeClassId].students.map(s => {
          if (s.id === studentId) {
            const hasTag = s.comportamentos.includes(behaviorId);
            return { ...s, comportamentos: hasTag ? s.comportamentos.filter(id => id !== behaviorId) : [...s.comportamentos, behaviorId] };
          }
          return s;
        })
      }
    };
    notifyChange(newData);
  };

  const handleAddCustomColumn = () => {
    if (!newColName.trim()) return;
    const newCol = { id: 'col_' + Date.now(), name: newColName, maxPoints: parseFloat(newColMax) || 10 };
    const newData = {
      ...appData,
      [activeClassId]: {
        ...appData[activeClassId],
        config: { ...appData[activeClassId].config, customColumns: [...appData[activeClassId].config.customColumns, newCol] }
      }
    };
    notifyChange(newData);
    setNewColName('');
    setIsColumnModalOpen(false);
  };

  const handleRemoveCustomColumn = (colId) => {
    if (window.confirm("Deseja mesmo remover esta avaliação? As notas lançadas nela serão apagadas.")) {
      const newData = {
        ...appData,
        [activeClassId]: {
          ...appData[activeClassId],
          config: { ...appData[activeClassId].config, customColumns: appData[activeClassId].config.customColumns.filter(c => c.id !== colId) }
        }
      };
      notifyChange(newData);
    }
  };

  // --- CÁLCULOS ---
  const calculateNotebookScore = (statusId, maxPoints) => {
    const status = NOTEBOOK_STATUS.find(s => s.id === statusId);
    if (!status || status.multiplier === null) return null;
    return (maxPoints * status.multiplier).toFixed(1);
  };

  const calculateTotal = (student, config) => {
    let total = 0;
    const p = parseFloat(student.prova); if (!isNaN(p)) total += p;
    const nb = calculateNotebookScore(student.caderno, config.notebookMax); if (nb) total += parseFloat(nb);
    config.customColumns.forEach(c => { const s = parseFloat(student.customScores[c.id]); if (!isNaN(s)) total += s; });
    return total.toFixed(1); 
  };

  if (isLoadingDB) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Diário Inteligente...</h2>
      </div>
    );
  }

  const activeData = appData[activeClassId] || { config: { semesterMax: 20, provaMax: 10, notebookMax: 2.0, customColumns: [] }, students: [] };
  const config = activeData.config;
  const pointsDistributed = (config.provaMax || 0) + (config.notebookMax || 0) + config.customColumns.reduce((sum, col) => sum + (col.maxPoints || 0), 0);
  const remainingPoints = config.semesterMax - pointsDistributed;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* HEADER & SALVAMENTO */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-lg text-white shadow-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">Diário Inteligente</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className={`text-xs font-bold uppercase tracking-widest flex items-center gap-1 ${hasUnsavedChanges ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {hasUnsavedChanges ? <RefreshCw className="w-3 h-3 animate-spin"/> : <CheckCircle2 className="w-3 h-3"/>}
                  {hasUnsavedChanges ? 'Alterações não salvas' : 'Tudo salvo'}
                </p>
                <button 
                  onClick={handleSaveToCloud}
                  disabled={!hasUnsavedChanges || isSaving}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black transition-all shadow-sm
                    ${hasUnsavedChanges 
                      ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse' 
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                >
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Save className="w-3 h-3"/>}
                  SALVAR AGORA
                </button>
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-4 p-3 rounded-lg border-2 ${remainingPoints < 0 ? 'border-red-300 bg-red-50' : 'border-emerald-100 bg-emerald-50'}`}>
             <div className="text-center px-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Total Semestre</span>
                <input type="number" value={config.semesterMax} onChange={(e) => handleConfigChange('semesterMax', e.target.value)} className="w-16 font-black text-xl text-slate-800 bg-transparent text-center focus:outline-none"/>
             </div>
             <div className="w-px h-8 bg-slate-200"></div>
             <div className="text-center px-2">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Restante</span>
                <span className={`font-black text-lg ${remainingPoints < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {remainingPoints.toFixed(1)}
                </span>
             </div>
          </div>
        </div>

        {/* NAVEGAÇÃO DE TURMAS E AÇÕES */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-hide">
            {classes.map(cls => (
              <button 
                key={cls.id} 
                onClick={() => setActiveClassId(cls.id)}
                className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeClassId === cls.id ? 'bg-slate-800 text-white shadow-md' : 'bg-transparent text-slate-500 hover:bg-slate-100'
                }`}
              >
                {cls.name}
              </button>
            ))}
            <button onClick={() => setIsClassModalOpen(true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><PlusCircle className="w-5 h-5"/></button>
          </div>

          <div className="flex gap-2 w-full md:w-auto flex-wrap">
            <button onClick={() => setIsColumnModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-bold border border-slate-200 shadow-sm transition">
              <PlusCircle className="w-4 h-4 text-blue-500" /> Coluna Extra
            </button>
            <button onClick={() => setIsPasteModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-bold shadow-md transition">
              <UserPlus className="w-4 h-4" /> Importar Lista
            </button>
            {/* BOTÃO NOVO DE APAGAR TURMA COM CONFIRMAÇÃO */}
            <button onClick={handleDeleteClass} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold border border-red-200 shadow-sm transition">
              <Trash2 className="w-4 h-4" /> Apagar Turma
            </button>
          </div>
        </div>

        {/* TABELA PRINCIPAL */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          {activeData.students.length === 0 ? (
            <div className="p-16 text-center">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Turma vazia</h3>
              <p className="text-sm text-slate-400">Importe alunos para começar a avaliar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-widest text-slate-500 font-black">
                    <th className="p-4 border-r border-slate-200 sticky left-0 bg-slate-50 z-10 w-64">Nome do Aluno</th>
                    <th className="p-4 border-r border-slate-200 w-28 text-center bg-blue-50/20">Prova ({config.provaMax})</th>
                    <th className="p-4 border-r border-slate-200 w-44 text-center">Caderno ({config.notebookMax})</th>
                    {config.customColumns.map(col => (
                      <th key={col.id} className="p-4 border-r border-slate-200 w-28 text-center group">
                        <div className="flex items-center justify-center gap-1">
                          <span className="truncate max-w-[80px]">{col.name}</span>
                          <button onClick={() => handleRemoveCustomColumn(col.id)} className="text-red-400 hover:text-red-600" title="Apagar Avaliação"><Trash2 className="w-3 h-3"/></button>
                        </div>
                        <span className="text-[8px] block font-normal">Máx {col.maxPoints}</span>
                      </th>
                    ))}
                    <th className="p-4 border-r border-slate-200 min-w-[200px]">Tags / Comportamento</th>
                    <th className="p-4 text-center bg-slate-900 text-white w-24">TOTAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeData.students.map((student, idx) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-2 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                        <div className="flex items-center gap-2">
                           <button 
                            onClick={() => handleDeleteStudent(student.id)} 
                            className="text-slate-200 hover:text-red-500 transition-opacity opacity-0 group-hover:opacity-100"
                            title="Apagar Aluno"
                           >
                            <Trash2 className="w-4 h-4"/>
                           </button>
                           <input type="text" value={student.name} onChange={(e) => handleUpdateStudent(student.id, 'name', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 font-bold text-slate-700 text-sm" />
                        </div>
                      </td>
                      <td className="p-2 border-r border-slate-100 bg-blue-50/5">
                        <input type="number" step="0.5" value={student.prova} onChange={(e) => handleUpdateStudent(student.id, 'prova', e.target.value)} className="w-full text-center font-black text-blue-700 bg-white border border-slate-200 rounded p-1 text-sm" />
                      </td>
                      <td className="p-2 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <select value={student.caderno} onChange={(e) => handleUpdateStudent(student.id, 'caderno', e.target.value)} className={`w-full text-[10px] font-black p-1 border rounded appearance-none cursor-pointer ${NOTEBOOK_STATUS.find(s => s.id === student.caderno)?.color}`}>
                            {NOTEBOOK_STATUS.map(s => <option key={s.id} value={s.id} className="bg-white">{s.label}</option>)}
                          </select>
                          <span className="text-[11px] font-black text-slate-400 w-6">{calculateNotebookScore(student.caderno, config.notebookMax) || '-'}</span>
                        </div>
                      </td>
                      {config.customColumns.map(col => (
                        <td key={col.id} className="p-2 border-r border-slate-100">
                          <input type="number" step="0.5" value={student.customScores[col.id] || ''} onChange={(e) => handleUpdateCustomScore(student.id, col.id, e.target.value)} className="w-full text-center font-bold text-slate-700 bg-white border border-slate-100 rounded p-1 text-sm" />
                        </td>
                      ))}
                      <td className="p-2 border-r border-slate-100 relative">
                        <div className="flex flex-wrap gap-1 items-center">
                          {student.comportamentos.map(bId => {
                            const tag = BEHAVIOR_TAGS.find(t => t.id === bId);
                            return tag ? (
                              <button key={bId} onClick={() => toggleBehavior(student.id, bId)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border uppercase ${tag.color}`}>
                                {tag.icon} {tag.label}
                              </button>
                            ) : null;
                          })}
                          <button onClick={() => setActiveBehaviorStudent(activeBehaviorStudent === student.id ? null : student.id)} className="text-slate-300 hover:text-blue-500 p-1"><PlusCircle className="w-4 h-4"/></button>
                          {activeBehaviorStudent === student.id && (
                            <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 shadow-2xl rounded-xl p-2 z-50 animate-in zoom-in-95 duration-200">
                              {BEHAVIOR_TAGS.map(tag => (
                                <button key={tag.id} onClick={() => toggleBehavior(student.id, tag.id)} className={`w-full text-left px-3 py-2 text-[10px] font-bold rounded-lg border flex items-center gap-2 mb-1 transition ${student.comportamentos.includes(tag.id) ? tag.color : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                                  {tag.icon} {tag.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-center bg-slate-50 group-hover:bg-blue-900 group-hover:text-white transition-all">
                        <span className="font-black text-lg">{calculateTotal(student, config)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODALS COM BOTÃO DE CANCELAR ADICIONADO */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6 border-b flex justify-between items-center text-slate-800">
              <h3 className="text-xl font-black">Importar Alunos</h3>
              <button onClick={() => setIsPasteModalOpen(false)}><XCircle className="w-6 h-6 text-slate-300"/></button>
            </div>
            <div className="p-6">
              <textarea value={pastedNames} onChange={(e) => setPastedNames(e.target.value)} placeholder="João Silva&#10;Maria Oliveira..." className="w-full h-64 p-4 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"></textarea>
            </div>
            <div className="p-6 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setIsPasteModalOpen(false)} className="px-6 py-2 font-bold text-slate-500">Cancelar</button>
              <button onClick={handlePasteStudents} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg">Importar</button>
            </div>
          </div>
        </div>
      )}

      {isColumnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6">
            <h3 className="text-lg font-black mb-4">Nova Avaliação</h3>
            <input type="text" placeholder="Nome da Atividade" value={newColName} onChange={(e) => setNewColName(e.target.value)} className="w-full p-3 border rounded-xl mb-3 outline-none" />
            <input type="number" placeholder="Nota Máxima" value={newColMax} onChange={(e) => setNewColMax(e.target.value)} className="w-full p-3 border rounded-xl mb-5 outline-none" />
            <div className="flex gap-2">
               <button onClick={() => setIsColumnModalOpen(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
               <button onClick={handleAddCustomColumn} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {isClassModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6">
            <h3 className="text-lg font-black mb-4">Nova Turma</h3>
            <input type="text" placeholder="Ex: 3º Ano B" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="w-full p-3 border rounded-xl mb-5 outline-none" onKeyDown={(e) => e.key === 'Enter' && confirmAddClass()} />
            <div className="flex gap-2">
               <button onClick={() => setIsClassModalOpen(false)} className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancelar</button>
               <button onClick={confirmAddClass} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
