/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  MessageCircle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Globe, 
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Download,
  Upload,
  Share2,
  FileJson,
  FileText,
  FileSpreadsheet,
  FileDown,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

// Extend jsPDF with autotable types
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// --- Types ---

type Language = 'fr' | 'ar';

interface Member {
  id: string;
  name: string;
  phone: string;
  monthlyAmount: number;
}

interface Payment {
  memberId: string;
  month: number; // 0-11
  year: number;
  amount: number;
}

// --- Constants ---

const MONTHS_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
];

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const TRANSLATIONS = {
  fr: {
    title: 'Hsseiy Ebekay',
    subtitle: 'Gestion des Cotisations',
    addMember: 'Ajouter un membre',
    editMember: 'Modifier le membre',
    name: 'Nom',
    phone: 'Téléphone',
    monthlyAmount: 'Montant Mensuel',
    actions: 'Actions',
    totalPaid: 'Total Payé',
    remaining: 'Reste',
    save: 'Enregistrer',
    cancel: 'Annuler',
    confirmDelete: 'Êtes-vous sûr de vouloir supprimer ce membre ?',
    delete: 'Supprimer',
    paymentFor: 'Paiement pour',
    amountPaid: 'Montant versé',
    status: 'Statut',
    paid: 'Payé',
    unpaid: 'Impayé',
    partial: 'Partiel',
    sendReminder: 'Envoyer Rappel',
    sendSummary: 'Partager Bilan',
    search: 'Rechercher...',
    noMembers: 'Aucun membre trouvé.',
    mru: 'MRU',
    export: 'Exporter',
    import: 'Importer',
    exportAs: 'Exporter en...',
    importFrom: 'Importer depuis...',
    importSuccess: 'Données importées avec succès !',
    importError: 'Erreur lors de l\'importation. Fichier invalide.',
    whatsappMessage: (name: string, month: string, amount: number) => 
      `Cher ${name}, le groupement Hsseiy Ebekay vous informe que votre cotisation de ${month} est en attente. Montant : ${amount} MRU.`,
    whatsappSummary: (name: string, paid: number, remaining: number) =>
      `Bilan Hsseiy Ebekay pour ${name} :\n- Total payé : ${paid} MRU\n- Reste à payer : ${remaining} MRU.`
  },
  ar: {
    title: 'حصي ابكاي',
    subtitle: 'تسيير الاشتراكات',
    addMember: 'إضافة عضو',
    editMember: 'تعديل العضو',
    name: 'الاسم',
    phone: 'الهاتف',
    monthlyAmount: 'المبلغ الشهري',
    actions: 'الإجراءات',
    totalPaid: 'المجموع المدفوع',
    remaining: 'المتبقي',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirmDelete: 'هل أنت متأكد من حذف هذا العضو؟',
    delete: 'حذف',
    paymentFor: 'دفع لـ',
    amountPaid: 'المبلغ المدفوع',
    status: 'الحالة',
    paid: 'تم الدفع',
    unpaid: 'لم يدفع',
    partial: 'دفع جزئي',
    sendReminder: 'إرسال تذكير',
    sendSummary: 'مشاركة الحصيلة',
    search: 'بحث...',
    noMembers: 'لم يتم العثور على أعضاء.',
    mru: 'أوقية',
    export: 'تصدير',
    import: 'استيراد',
    exportAs: 'تصدير كـ...',
    importFrom: 'استيراد من...',
    importSuccess: 'تم استيراد البيانات بنجاح!',
    importError: 'خطأ في الاستيراد. ملف غير صالح.',
    whatsappMessage: (name: string, month: string, amount: number) => 
      `عزيزي ${name}، يحيطكم تجمع "حصي ابكاي" علماً بأن مساهمتكم لشهر ${month} قيد الانتظار. المبلغ: ${amount} أوقية.`,
    whatsappSummary: (name: string, paid: number, remaining: number) =>
      `حصيلة "حصي ابكاي" لـ ${name} :\n- المجموع المدفوع: ${paid} أوقية\n- المتبقي: ${remaining} أوقية.`
  }
};

const INITIAL_MEMBERS: Member[] = [
  { id: '1', name: 'Aicha val Michel', phone: '00000000', monthlyAmount: 30000 },
  { id: '2', name: 'Dah sid Amar', phone: '00000000', monthlyAmount: 10000 },
  { id: '3', name: 'Mohamed mahmoud mebroum', phone: '00000000', monthlyAmount: 5000 },
];

export default function App() {
  const [lang, setLang] = useState<Language>('fr');
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [activePayment, setActivePayment] = useState<{ memberId: string, month: number } | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importTypeRef = useRef<'json' | 'csv' | 'xlsx'>('json');
  
  const currentYear = new Date().getFullYear();
  const t = TRANSLATIONS[lang];
  const months = lang === 'fr' ? MONTHS_FR : MONTHS_AR;
  const isRtl = lang === 'ar';

  // --- Persistence ---

  useEffect(() => {
    const savedMembers = localStorage.getItem('ebekay_members');
    const savedPayments = localStorage.getItem('ebekay_payments');
    
    if (savedMembers) {
      setMembers(JSON.parse(savedMembers));
    } else {
      setMembers(INITIAL_MEMBERS);
      localStorage.setItem('ebekay_members', JSON.stringify(INITIAL_MEMBERS));
    }
    
    if (savedPayments) {
      setPayments(JSON.parse(savedPayments));
    }
  }, []);

  useEffect(() => {
    if (members.length > 0) {
      localStorage.setItem('ebekay_members', JSON.stringify(members));
    }
  }, [members]);

  useEffect(() => {
    localStorage.setItem('ebekay_payments', JSON.stringify(payments));
  }, [payments]);

  // --- Handlers ---

  const handleAddMember = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const monthlyAmount = Number(formData.get('monthlyAmount'));

    if (editingMember) {
      setMembers(members.map(m => m.id === editingMember.id ? { ...m, name, phone, monthlyAmount } : m));
    } else {
      const newMember: Member = {
        id: crypto.randomUUID(),
        name,
        phone,
        monthlyAmount
      };
      setMembers([...members, newMember]);
    }
    
    setIsMemberModalOpen(false);
    setEditingMember(null);
  };

  const handleDeleteMember = (id: string) => {
    if (window.confirm(t.confirmDelete)) {
      setMembers(members.filter(m => m.id !== id));
      setPayments(payments.filter(p => p.memberId !== id));
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activePayment) return;

    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get('amount'));

    const existingIndex = payments.findIndex(p => 
      p.memberId === activePayment.memberId && 
      p.month === activePayment.month && 
      p.year === currentYear
    );

    if (existingIndex > -1) {
      const newPayments = [...payments];
      newPayments[existingIndex].amount = amount;
      setPayments(newPayments);
    } else {
      setPayments([...payments, {
        memberId: activePayment.memberId,
        month: activePayment.month,
        year: currentYear,
        amount
      }]);
    }

    setIsPaymentModalOpen(false);
    setActivePayment(null);
  };

  const sendWhatsAppReminder = (member: Member, monthIndex: number) => {
    const monthName = months[monthIndex];
    const message = t.whatsappMessage(member.name, monthName, member.monthlyAmount);
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${member.phone}?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const sendWhatsAppSummary = (member: Member) => {
    const { totalPaid, remaining } = getMemberStats(member);
    const message = t.whatsappSummary(member.name, totalPaid, remaining);
    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${member.phone}?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const handleExportJSON = () => {
    const data = {
      members,
      payments,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ebekay_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  const handleExportCSV = () => {
    const csvData = members.map(m => {
      const stats = getMemberStats(m);
      const row: any = {
        [t.name]: m.name,
        [t.phone]: m.phone,
        [t.monthlyAmount]: m.monthlyAmount,
        [t.totalPaid]: stats.totalPaid,
        [t.remaining]: stats.remaining
      };
      months.forEach((month, i) => {
        const p = payments.find(pay => pay.memberId === m.id && pay.month === i && pay.year === currentYear);
        row[month] = p ? p.amount : 0;
      });
      return row;
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ebekay_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
  };

  const handleExportExcel = () => {
    const excelData = members.map(m => {
      const stats = getMemberStats(m);
      const row: any = {
        [t.name]: m.name,
        [t.phone]: m.phone,
        [t.monthlyAmount]: m.monthlyAmount
      };
      months.forEach((month, i) => {
        const p = payments.find(pay => pay.memberId === m.id && pay.month === i && pay.year === currentYear);
        row[month] = p ? p.amount : 0;
      });
      row[t.totalPaid] = stats.totalPaid;
      row[t.remaining] = stats.remaining;
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cotisations");
    XLSX.writeFile(wb, `ebekay_export_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const title = `${t.title} - ${t.subtitle} (${currentYear})`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    const tableData = members.map((m, idx) => {
      const stats = getMemberStats(m);
      const row = [
        idx + 1,
        m.name,
        m.monthlyAmount.toLocaleString(),
        ...months.map((_, i) => {
          const p = payments.find(pay => pay.memberId === m.id && pay.month === i && pay.year === currentYear);
          return p ? p.amount.toLocaleString() : '0';
        }),
        stats.totalPaid.toLocaleString(),
        stats.remaining.toLocaleString()
      ];
      return row;
    });

    const headers = [
      'ID', 
      t.name, 
      t.monthlyAmount, 
      ...months, 
      t.totalPaid, 
      t.remaining
    ];

    doc.autoTable({
      startY: 30,
      head: [headers],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] }, // Emerald-600
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 }
      }
    });

    doc.save(`ebekay_report_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsExportMenuOpen(false);
  };

  const handleImportClick = (type: 'json' | 'csv' | 'xlsx') => {
    importTypeRef.current = type;
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'json' ? '.json' : type === 'csv' ? '.csv' : '.xlsx,.xls';
      fileInputRef.current.click();
    }
    setIsImportMenuOpen(false);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const type = importTypeRef.current;

    if (type === 'json') {
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.members && data.payments) {
            setMembers(data.members);
            setPayments(data.payments);
            alert(t.importSuccess);
          } else {
            throw new Error('Invalid format');
          }
        } catch (err) {
          alert(t.importError);
        }
      };
      reader.readAsText(file);
    } else if (type === 'csv') {
      reader.onload = (event) => {
        Papa.parse(event.target?.result as string, {
          header: true,
          complete: (results) => {
            try {
              processImportedRows(results.data);
            } catch (err) {
              alert(t.importError);
            }
          }
        });
      };
      reader.readAsText(file);
    } else if (type === 'xlsx') {
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        try {
          processImportedRows(jsonData);
        } catch (err) {
          alert(t.importError);
        }
      };
      reader.readAsArrayBuffer(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImportedRows = (rows: any[]) => {
    const newMembers: Member[] = [];
    const newPayments: Payment[] = [];

    rows.forEach(row => {
      if (!row[t.name]) return;

      const memberId = crypto.randomUUID();
      newMembers.push({
        id: memberId,
        name: row[t.name],
        phone: row[t.phone] || '00000000',
        monthlyAmount: Number(row[t.monthlyAmount]) || 0
      });

      months.forEach((month, i) => {
        if (row[month] !== undefined) {
          newPayments.push({
            memberId,
            month: i,
            year: currentYear,
            amount: Number(row[month]) || 0
          });
        }
      });
    });

    if (newMembers.length > 0) {
      setMembers(newMembers);
      setPayments(newPayments);
      alert(t.importSuccess);
    } else {
      throw new Error('No valid members found');
    }
  };

  // --- Helpers ---

  const getPaymentStatus = (memberId: string, month: number, monthlyAmount: number) => {
    const payment = payments.find(p => p.memberId === memberId && p.month === month && p.year === currentYear);
    if (!payment || payment.amount === 0) return 'unpaid';
    if (payment.amount >= monthlyAmount) return 'paid';
    return 'partial';
  };

  const getMemberStats = (member: Member) => {
    const memberPayments = payments.filter(p => p.memberId === member.id && p.year === currentYear);
    const totalPaid = memberPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalExpected = member.monthlyAmount * 12;
    const remaining = totalExpected - totalPaid;
    return { totalPaid, remaining };
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      m.phone.includes(searchTerm)
    );
  }, [members, searchTerm]);

  // --- Render ---

  return (
    <div className={`min-h-screen bg-stone-50 text-stone-900 font-sans ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImport} 
        accept=".json" 
        className="hidden" 
      />

      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-stone-900">{t.title}</h1>
              <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3">
            {/* Lang Toggle */}
            <button 
              onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-sm font-medium"
            >
              <Globe size={16} />
              <span className="hidden sm:inline">{lang === 'fr' ? 'العربية' : 'Français'}</span>
            </button>

            {/* Import/Export */}
            <div className="flex items-center gap-2">
              {/* Export Menu */}
              <div className="relative">
                <button 
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-sm font-medium bg-white"
                >
                  <Download size={16} />
                  <span className="hidden sm:inline">{t.export}</span>
                  <ChevronDown size={14} className={`transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isExportMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 z-50 overflow-hidden"
                      >
                        <div className="p-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-50">{t.exportAs}</div>
                        <button onClick={handleExportJSON} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                          <FileJson size={16} className="text-amber-500" /> JSON
                        </button>
                        <button onClick={handleExportCSV} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                          <FileText size={16} className="text-blue-500" /> CSV
                        </button>
                        <button onClick={handleExportExcel} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                          <FileSpreadsheet size={16} className="text-emerald-500" /> Excel
                        </button>
                        <button onClick={handleExportPDF} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                          <FileDown size={16} className="text-red-500" /> PDF
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* Import Menu */}
              <div className="relative">
                <button 
                  onClick={() => setIsImportMenuOpen(!isImportMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-sm font-medium bg-white"
                >
                  <Upload size={16} />
                  <span className="hidden sm:inline">{t.import}</span>
                  <ChevronDown size={14} className={`transition-transform ${isImportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isImportMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsImportMenuOpen(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 z-50 overflow-hidden"
                      >
                        <div className="p-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-50">{t.importFrom}</div>
                        <button onClick={() => handleImportClick('json')} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                          <FileJson size={16} className="text-amber-500" /> JSON
                        </button>
                        <button onClick={() => handleImportClick('csv')} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                          <FileText size={16} className="text-blue-500" /> CSV
                        </button>
                        <button onClick={() => handleImportClick('xlsx')} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50 transition-colors">
                          <FileSpreadsheet size={16} className="text-emerald-500" /> Excel
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {/* Add Member */}
            <button 
              onClick={() => {
                setEditingMember(null);
                setIsMemberModalOpen(true);
              }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg active:scale-95 text-sm font-semibold"
            >
              <UserPlus size={18} />
              <span>{t.addMember}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Stats */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              type="text" 
              placeholder={t.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-sm ${isRtl ? 'pr-10 pl-4' : ''}`}
            />
          </div>
          
          <div className="flex gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              {t.paid}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full border border-orange-100">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              {t.partial}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full border border-red-100">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              {t.unpaid}
            </div>
          </div>
        </div>

        {/* Dashboard Table */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/50 border-b border-stone-200">
                  <th className="px-4 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{isRtl ? 'رقم' : 'ID'}</th>
                  <th className="px-4 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t.name}</th>
                  <th className="px-4 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t.monthlyAmount}</th>
                  {months.map((m, i) => (
                    <th key={i} className="px-2 py-4 text-center text-xs font-bold text-stone-400 uppercase tracking-wider min-w-[60px]">{m}</th>
                  ))}
                  <th className="px-4 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t.totalPaid}</th>
                  <th className="px-4 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">{t.remaining}</th>
                  <th className="px-4 py-4 text-center text-xs font-bold text-stone-400 uppercase tracking-wider">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredMembers.map((member, idx) => {
                  const { totalPaid, remaining } = getMemberStats(member);
                  return (
                    <tr key={member.id} className="hover:bg-stone-50/50 transition-colors group">
                      <td className="px-4 py-4 text-sm text-stone-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-stone-900">{member.name}</div>
                        <div className="text-xs text-stone-500 font-mono">{member.phone}</div>
                      </td>
                      <td className="px-4 py-4 font-mono text-sm font-semibold text-stone-700">
                        {member.monthlyAmount.toLocaleString()} <span className="text-[10px] text-stone-400">{t.mru}</span>
                      </td>
                      {months.map((_, i) => {
                        const status = getPaymentStatus(member.id, i, member.monthlyAmount);
                        const payment = payments.find(p => p.memberId === member.id && p.month === i && p.year === currentYear);
                        return (
                          <td key={i} className="px-1 py-4 text-center">
                            <button 
                              onClick={() => {
                                setActivePayment({ memberId: member.id, month: i });
                                setIsPaymentModalOpen(true);
                              }}
                              className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-sm border
                                ${status === 'paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 
                                  status === 'partial' ? 'bg-orange-50 border-orange-200 text-orange-600' : 
                                  'bg-red-50 border-red-200 text-red-600'}`}
                            >
                              {status === 'paid' ? <CheckCircle2 size={16} /> : 
                               status === 'partial' ? <AlertCircle size={16} /> : 
                               <XCircle size={16} />}
                              {payment && payment.amount > 0 && payment.amount < member.monthlyAmount && (
                                <span className="text-[8px] font-bold mt-0.5">{(payment.amount / 1000).toFixed(1)}k</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 font-mono text-sm font-bold text-emerald-600">
                        {totalPaid.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 font-mono text-sm font-bold text-red-500">
                        {remaining.toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => {
                              setEditingMember(member);
                              setIsMemberModalOpen(true);
                            }}
                            className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteMember(member.id)}
                            className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                          <div className="flex flex-col gap-1">
                            <button 
                              onClick={() => {
                                const firstUnpaid = Array.from({length: 12}).findIndex((_, i) => 
                                  getPaymentStatus(member.id, i, member.monthlyAmount) !== 'paid'
                                );
                                sendWhatsAppReminder(member, firstUnpaid !== -1 ? firstUnpaid : 0);
                              }}
                              className="p-2 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              title={t.sendReminder}
                            >
                              <MessageCircle size={18} />
                            </button>
                            <button 
                              onClick={() => sendWhatsAppSummary(member)}
                              className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title={t.sendSummary}
                            >
                              <Share2 size={18} />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredMembers.length === 0 && (
            <div className="py-20 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-400">
                <Search size={32} />
              </div>
              <p className="text-stone-500 font-medium">{t.noMembers}</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 text-center text-stone-400 text-xs font-medium uppercase tracking-widest">
        &copy; {currentYear} {t.title} &bull; Responsable: Mboy
      </footer>

      {/* Member Modal */}
      <AnimatePresence>
        {isMemberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMemberModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-stone-900">
                  {editingMember ? t.editMember : t.addMember}
                </h2>
                <button onClick={() => setIsMemberModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                  <XCircle size={24} />
                </button>
              </div>
              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">{t.name}</label>
                  <input 
                    name="name" 
                    required 
                    defaultValue={editingMember?.name}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">{t.phone}</label>
                  <input 
                    name="phone" 
                    required 
                    defaultValue={editingMember?.phone}
                    placeholder="e.g. 222..."
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">{t.monthlyAmount} ({t.mru})</label>
                  <input 
                    name="monthlyAmount" 
                    type="number" 
                    required 
                    defaultValue={editingMember?.monthlyAmount}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsMemberModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-stone-600 font-bold hover:bg-stone-50 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && activePayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100">
                <h2 className="text-lg font-bold text-stone-900">
                  {t.paymentFor} {months[activePayment.month]}
                </h2>
                <p className="text-sm text-stone-500">
                  {members.find(m => m.id === activePayment.memberId)?.name}
                </p>
              </div>
              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1.5">{t.amountPaid} ({t.mru})</label>
                  <input 
                    name="amount" 
                    type="number" 
                    required 
                    autoFocus
                    defaultValue={payments.find(p => p.memberId === activePayment.memberId && p.month === activePayment.month && p.year === currentYear)?.amount || 0}
                    className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-lg font-bold"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-stone-600 font-bold hover:bg-stone-50 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
