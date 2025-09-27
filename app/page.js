'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { initializeApp, getApps } from 'firebase/app';
import { 
    getFirestore,
    collection, 
    addDoc, 
    onSnapshot, 
    doc, 
    deleteDoc, 
    query, 
    orderBy, 
    writeBatch,
    setDoc
} from 'firebase/firestore';

// --- Firebase設定 ---
// 重要：以下の placeholder（"YOUR_..."）部分を、
// あなたのFirebaseプロジェクトの設定値に書き換えてください。
const firebaseConfig = {
  apiKey: "AIzaSyBLN8Vg5oPNa-1VpqzemAGQOPlyEOr1JU8",
  authDomain: "expense-tracker-2024-9a562.firebaseapp.com",
  projectId: "expense-tracker-2024-9a562",
  storageBucket: "expense-tracker-2024-9a562.firebasestorage.app",
  messagingSenderId: "811729551695",
  appId: "1:811729551695:web:64860512a3b406a460053a"
};

// --- Firebase初期化 ---
let db;
try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
} catch (error) {
    console.error("Firebaseの初期化に失敗しました。firebaseConfigの値が正しいか確認してください。", error);
    db = null;
}


// --- 定数データ ---
// スクリーンショットを元にカテゴリデータを更新
const CATEGORY_DATA = {
    '食費': { '食材': '消費', '外食': '浪費', 'その他': '消費' },
    '日用品': { 'キッチン': '消費', 'トイレ': '消費', '洗面所': '消費', '風呂': '消費', '掃除': '消費', '医薬品': '投資', '家具': '消費', 'その他': '消費' },
    '健康': { '病院': '投資', 'スポーツ': '投資', 'その他': '投資' },
    '娯楽': { '交通費': '浪費', 'ホテル代': '浪費', '買い物': '浪費', 'サブスク': '浪費', '家具': '浪費', '入場料': '浪費', 'その他': '浪費' },
    'その他': { 'お土産': '消費', 'ペット': '消費', 'ホテル代': '消費', '光熱費': '消費', 'その他': '消費' }
};
const PAYERS = ['久喜さん', '真那実さん'];
const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF6B6B'];


// --- Barneyコンポーネント ---
const BarneyCharacter = () => (
    <div className="fixed bottom-5 right-5 opacity-70 hover:opacity-100 transition-opacity duration-300 animate-bounce delay-500 pointer-events-none z-50">
        <div className="relative">
            <svg width="120" height="120" viewBox="0 0 120 120" className="drop-shadow-2xl">
                <ellipse cx="60" cy="80" rx="25" ry="35" fill="#8B5A9F" />
                <circle cx="60" cy="40" r="30" fill="#A855C7" />
                <ellipse cx="60" cy="75" rx="15" ry="20" fill="#22C55E" />
                <circle cx="52" cy="35" r="6" fill="white" /><circle cx="53" cy="34" r="4" fill="black" /><circle cx="54" cy="33" r="1.5" fill="white" />
                <circle cx="68" cy="35" r="6" fill="white" /><circle cx="67" cy="34" r="4" fill="black" /><circle cx="66" cy="33" r="1.5" fill="white" />
                <path d="M 45 50 Q 60 60 75 50" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 45 50 Q 60 55 75 50" fill="#8B5A9F" />
                <ellipse cx="35" cy="70" rx="8" ry="15" fill="#A855C7" />
                <ellipse cx="85" cy="70" rx="8" ry="15" fill="#A855C7" />
                <ellipse cx="50" cy="105" rx="8" ry="12" fill="#A855C7" /><ellipse cx="50" cy="115" rx="10" ry="5" fill="#FCD34D" />
                <ellipse cx="70" cy="105" rx="8" ry="12" fill="#A855C7" /><ellipse cx="70" cy="115" rx="10" ry="5" fill="#FCD34D" />
            </svg>
        </div>
    </div>
);

// --- メインアプリケーションコンポーネント ---
export default function KakeiboApp() {
    const [activeTab, setActiveTab] = useState('input');
    const [expenses, setExpenses] = useState([]);
    const [settlements, setSettlements] = useState({});
    const [loading, setLoading] = useState(true);
    const [firebaseError, setFirebaseError] = useState(false);

    // Firebaseからデータをリアルタイムで購読
    useEffect(() => {
        if (!db) {
            console.error("Firebase is not initialized.");
            setLoading(false);
            setFirebaseError(true);
            return;
        };
        const expensesQuery = query(collection(db, "expenses"), orderBy("date", "desc"));
        const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
            const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setExpenses(expensesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching expenses: ", error);
            setLoading(false);
            setFirebaseError(true);
        });

        const settlementsQuery = query(collection(db, "settlements"));
        const unsubscribeSettlements = onSnapshot(settlementsQuery, (snapshot) => {
            const settlementsData = {};
            snapshot.docs.forEach(doc => {
                settlementsData[doc.id] = doc.data().settled;
            });
            setSettlements(settlementsData);
        }, (error) => {
            console.error("Error fetching settlements: ", error);
        });

        return () => {
            unsubscribeExpenses();
            unsubscribeSettlements();
        };
    }, []);

    const renderContent = () => {
        if (firebaseError) return <div className="text-center p-10 text-red-500 font-bold">Firebaseの接続設定を確認してください。</div>
        if (loading) return <div className="text-center p-10">データを読み込み中...</div>;

        switch (activeTab) {
            case 'input': return <InputTab />;
            case 'inquiry': return <InquiryTab expenses={expenses} />;
            case 'history': return <HistoryTab expenses={expenses} settlements={settlements} />;
            default: return null;
        }
    };
    
    return (
        <div className="min-h-screen bg-purple-50 text-gray-800 font-sans">
            <BarneyCharacter />
            <div className="container mx-auto p-4 max-w-6xl relative">
                <header className="text-center my-6">
                    <h1 className="text-4xl font-extrabold text-purple-700">家計簿アプリ by Barney</h1>
                    <p className="text-purple-500 mt-2">ふたりの支出を楽しく管理するバニ！</p>
                </header>
                <nav className="flex justify-center border-b-2 border-purple-200 mb-6">
                    {['input', 'inquiry', 'history'].map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 text-lg font-bold rounded-t-lg transition-colors duration-300 ${activeTab === tab ? 'bg-purple-500 text-white shadow-lg' : 'bg-white text-purple-500 hover:bg-purple-100'}`}>
                            { {input: '入力', inquiry: '照会', history: '履歴'}[tab] }
                        </button>
                    ))}
                </nav>
                <main>{renderContent()}</main>
            </div>
        </div>
    );
}

// --- 入力タブ ---
function InputTab() {
    const [formData, setFormData] = useState({
        payer: PAYERS[0],
        date: new Date().toISOString().split('T')[0],
        item: '',
        amount: '',
        ratio: 5,
        majorCategory: '食費',
        subCategory: '食材',
        purpose: '消費'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const subCategories = Object.keys(CATEGORY_DATA[formData.majorCategory] || {});
        const newSubCategory = subCategories[0] || '';
        const newPurpose = newSubCategory ? CATEGORY_DATA[formData.majorCategory][newSubCategory] : '';
        setFormData(prev => ({
            ...prev,
            subCategory: newSubCategory,
            purpose: newPurpose
        }));
    }, [formData.majorCategory]);

    const handleChange = (field, value) => {
        const newData = { ...formData, [field]: value };
        if (field === 'subCategory') {
            newData.purpose = CATEGORY_DATA[formData.majorCategory][value];
        }
        setFormData(newData);
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const amountNumber = parseFloat(formData.amount);

        if (!formData.item || !formData.date) {
            alert('品名と日付は必須バニ！');
            return;
        }
        
        if (isNaN(amountNumber) || amountNumber <= 0) {
            alert('金額には0より大きい半角数字を入力するバニ！');
            return;
        }

        if (!db) {
            alert('データベースに接続できません。Firebaseの設定を確認してください。');
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "expenses"), {
                ...formData,
                amount: amountNumber,
                createdAt: new Date()
            });
            setMessage('登録完了バニ！');
            setFormData({
                payer: PAYERS[0], date: new Date().toISOString().split('T')[0], item: '', amount: '', ratio: 5, majorCategory: '食費', subCategory: '食材', purpose: '消費'
            });
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("登録に失敗しました。");
        }
        setIsSubmitting(false);
    };

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
                <FormRow label="支払者" question="支払ったのは誰バニ？">
                    <div className="flex space-x-4">
                        {PAYERS.map(p => (
                            <label key={p} className="flex items-center space-x-2"><input type="radio" value={p} checked={formData.payer === p} onChange={e => handleChange('payer', e.target.value)} className="form-radio h-5 w-5 text-purple-600"/><span>{p}</span></label>
                        ))}
                    </div>
                </FormRow>
                <FormRow label="出費日付" question="出費日付を記載するバニ！">
                    <input type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} className="form-input w-full"/>
                </FormRow>
                <FormRow label="品目" question="何に使ったお金バニか？">
                    <input type="text" placeholder="スーパーでの買い物" value={formData.item} onChange={e => handleChange('item', e.target.value)} className="form-input w-full"/>
                </FormRow>
                <FormRow label="金額" question="金額を記載するバニ！">
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">¥</span><input type="number" placeholder="1000" value={formData.amount} onChange={e => handleChange('amount', e.target.value)} className="form-input w-full pl-8"/></div>
                </FormRow>
                <FormRow label="負担割合" question="負担割合を入力するバニ！">
                    <div className="text-center font-bold text-xl text-purple-600 my-2">真那実さん {formData.ratio} : {10-formData.ratio} 久喜さん</div>
                    <input type="range" min="0" max="10" value={formData.ratio} onChange={e => handleChange('ratio', parseInt(e.target.value))} className="w-full"/>
                </FormRow>
                <FormRow label="大種別" question="出費の大種別は何バニか？">
                    <select value={formData.majorCategory} onChange={e => handleChange('majorCategory', e.target.value)} className="form-select w-full">
                        {Object.keys(CATEGORY_DATA).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </FormRow>
                <FormRow label="種別" question="出費の種別は何バニか？">
                    <select value={formData.subCategory} onChange={e => handleChange('subCategory', e.target.value)} className="form-select w-full">
                        {Object.keys(CATEGORY_DATA[formData.majorCategory] || {}).map(sub => <option key={sub} value={sub}>{sub}</option>)}
                    </select>
                </FormRow>
                <FormRow label="目的" question="目的は何バニか？">
                     <p className="bg-gray-100 p-3 rounded text-gray-700 font-semibold">{formData.purpose}</p>
                </FormRow>
                <div className="text-center pt-4">
                    <button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-800 text-white font-bold py-3 px-8 rounded-full focus:outline-none focus:shadow-outline transition-transform transform hover:scale-105 disabled:bg-gray-400">
                        {isSubmitting ? '登録中...' : '登録するバニ！'}
                    </button>
                    {message && <p className="text-green-500 font-bold mt-4">{message}</p>}
                </div>
            </form>
        </div>
    );
}

const FormRow = ({ label, question, children }) => (
    <div>
        <label className="block text-purple-700 text-sm font-bold mb-1">{label}</label>
        <p className="text-gray-600 mb-2 italic text-xs">Q: {question}</p>
        {children}
    </div>
);


function PeriodSelector({ period, setPeriod, expenses }) {
    const years = useMemo(() => {
        const expenseYears = expenses.map(ex => new Date(ex.date).getFullYear());
        return Array.from(new Set([new Date().getFullYear(), ...expenseYears])).sort((a,b) => b-a);
    }, [expenses]);
    const months = Array.from({ length: 12 }, (_, i) => i + 1);

    const handleStartChange = (field, value) => {
        const newPeriod = { ...period, [field]: value };
        if (newPeriod.startYear > newPeriod.endYear || (newPeriod.startYear === newPeriod.endYear && newPeriod.startMonth > newPeriod.endMonth)) {
            newPeriod.endYear = newPeriod.startYear;
            newPeriod.endMonth = newPeriod.startMonth;
        }
        setPeriod(newPeriod);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">期間選択</h2>
            <div className="flex items-center justify-center space-x-2 flex-wrap">
                <select value={period.startYear} onChange={e => handleStartChange('startYear', Number(e.target.value))} className="form-select">{years.map(y => <option key={y} value={y}>{y}年</option>)}</select>
                <select value={period.startMonth} onChange={e => handleStartChange('startMonth', Number(e.target.value))} className="form-select">{months.map(m => <option key={m} value={m}>{m}月</option>)}</select>
                <span className="font-bold text-lg">〜</span>
                <select value={period.endYear} onChange={e => setPeriod({...period, endYear: Number(e.target.value)})} className="form-select">{years.map(y => <option key={y} value={y}>{y}年</option>)}</select>
                <select value={period.endMonth} onChange={e => setPeriod({...period, endMonth: Number(e.target.value)})} className="form-select">{months.map(m => <option key={m} value={m}>{m}月</option>)}</select>
            </div>
        </div>
    );
}

function InquiryTab({ expenses }) {
    const [period, setPeriod] = useState({
        startYear: new Date().getFullYear(), startMonth: new Date().getMonth() + 1,
        endYear: new Date().getFullYear(), endMonth: new Date().getMonth() + 1,
    });

    const filteredExpenses = useMemo(() => {
        // --- ▼ここからが日付修正箇所▼ ---
        const startDate = new Date(period.startYear, period.startMonth - 1, 1);
        const endDate = new Date(period.endYear, period.endMonth, 0, 23, 59, 59); // 月末日の23:59:59に設定
        // --- ▲ここまでが日付修正箇所▲ ---
        return expenses.filter(ex => {
            const exDate = new Date(ex.date);
            // タイムゾーンを考慮するため、入力された日付文字列をUTCとして解釈し直す
            const adjustedExDate = new Date(exDate.getUTCFullYear(), exDate.getUTCMonth(), exDate.getUTCDate());
            return adjustedExDate >= startDate && adjustedExDate <= endDate;
        });
    }, [expenses, period]);
    
    const settlement = useMemo(() => {
        let manamiOwesHisaki = 0, hisakiOwesManami = 0;
        filteredExpenses.forEach(ex => {
            if (ex.payer === '久喜さん') {
                manamiOwesHisaki += ex.amount * (ex.ratio / 10);
            } else {
                hisakiOwesManami += ex.amount * ((10 - ex.ratio) / 10);
            }
        });
        const diff = manamiOwesHisaki - hisakiOwesManami;
        if (diff > 0) return { from: '真那実さん', to: '久喜さん', amount: Math.round(diff) };
        if (diff < 0) return { from: '久喜さん', to: '真那実さん', amount: Math.round(Math.abs(diff)) };
        return { amount: 0 };
    }, [filteredExpenses]);

    const prepareChartData = useCallback((key) => {
        const dataMap = filteredExpenses.reduce((acc, ex) => {
            const value = ex[key] || "未分類";
            acc[value] = (acc[value] || 0) + ex.amount;
            return acc;
        }, {});
        return Object.entries(dataMap).map(([name, value]) => ({ name, value }));
    }, [filteredExpenses]);

    return (
        <div className="space-y-6">
            <PeriodSelector period={period} setPeriod={setPeriod} expenses={expenses} />
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
                <h2 className="text-2xl font-bold text-purple-700 mb-2">精算金額</h2>
                {settlement.amount > 0 ? (
                    <p className="text-3xl font-extrabold text-red-500 animate-pulse">{settlement.from}は{settlement.to}に {settlement.amount.toLocaleString()}円 払うバニ！</p>
                ) : (
                    <p className="text-3xl font-extrabold text-green-500">精算は完了してるバニ！</p>
                )}
            </div>
            <div className="grid md:grid-cols-3 gap-6">
                <ChartCard title="大種別の内訳" data={prepareChartData('majorCategory')} />
                <ChartCard title="種別の内訳" data={prepareChartData('subCategory')} />
                <ChartCard title="目的の内訳" data={prepareChartData('purpose')} />
            </div>
        </div>
    );
}

const ChartCard = ({ title, data }) => (
    <div className="bg-white p-4 rounded-xl shadow-lg h-96">
        <h3 className="text-xl font-bold text-center text-purple-700 mb-4">{title}</h3>
        {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                        {data.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toLocaleString()}円`} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        ) : <p className="text-center text-gray-500 pt-20">データなし</p>}
    </div>
);

function HistoryTab({ expenses, settlements }) {
    const [period, setPeriod] = useState({
        startYear: new Date().getFullYear(), startMonth: 1,
        endYear: new Date().getFullYear(), endMonth: 12,
    });
    const [selectedIds, setSelectedIds] = useState(new Set());

    const filteredExpenses = useMemo(() => {
        // --- ▼ここからが日付修正箇所▼ ---
        const startDate = new Date(period.startYear, period.startMonth - 1, 1);
        const endDate = new Date(period.endYear, period.endMonth, 0, 23, 59, 59); // 月末日の23:59:59に設定
        // --- ▲ここまでが日付修正箇所▲ ---
        return expenses.filter(ex => {
            const exDate = new Date(ex.date);
            // タイムゾーンを考慮するため、入力された日付文字列をUTCとして解釈し直す
            const adjustedExDate = new Date(exDate.getUTCFullYear(), exDate.getUTCMonth(), exDate.getUTCDate());
            return adjustedExDate >= startDate && adjustedExDate <= endDate;
        });
    }, [expenses, period]);

    const unsettledMonths = useMemo(() => {
        const months = new Set(expenses.map(ex => ex.date.substring(0, 7)));
        return Array.from(months).filter(month => !settlements[month]).sort().reverse();
    }, [expenses, settlements]);
    
    const handleSettleMonth = async (monthKey) => {
        if (!db) return;
        try {
            await setDoc(doc(db, "settlements", monthKey), { settled: true });
        } catch (e) { console.error("Error updating settlement: ", e); }
    };
    
    const handleDelete = async () => {
        if (selectedIds.size === 0 || !db) return;
        if (window.confirm(`${selectedIds.size}件のデータを削除しますか？`)) {
            const batch = writeBatch(db);
            selectedIds.forEach(id => batch.delete(doc(db, "expenses", id)));
            await batch.commit();
            setSelectedIds(new Set());
        }
    };

    const toggleSelect = id => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedIds(newSelection);
    };

    return (
        <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-purple-700 mb-4">未精算の管理</h2>
                    <div className="space-y-2">
                         {unsettledMonths.length > 0 ? unsettledMonths.map(monthKey => {
                            const [year, month] = monthKey.split('-');
                            return (
                                <div key={monthKey} className="flex items-center bg-yellow-100 p-2 rounded justify-between">
                                    <span className="text-lg text-yellow-800">{`${year}年 ${parseInt(month, 10)}月`}</span>
                                    <button onClick={() => handleSettleMonth(monthKey)} className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-1 px-2 rounded">精算済みにする</button>
                                </div>
                            );
                        }) : <p className="text-gray-500">未精算の月はありません！</p>}
                    </div>
                </div>
                <div className="md:col-span-2">
                    <PeriodSelector period={period} setPeriod={setPeriod} expenses={expenses} />
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-purple-700">履歴一覧</h2>
                    {selectedIds.size > 0 && (
                        <button onClick={handleDelete} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">
                            選択した{selectedIds.size}件を削除
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-purple-100">
                            <tr>
                                <th className="p-4"><input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? new Set(filteredExpenses.map(ex => ex.id)) : new Set())}/></th>
                                {['日付', '品名', '金額', '支払者', '負担割合', '大種別', '種別', '目的'].map(h => <th key={h} className="px-6 py-3">{h}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.map(ex => (
                                <tr key={ex.id} className="bg-white border-b hover:bg-purple-50">
                                    <td className="p-4"><input type="checkbox" checked={selectedIds.has(ex.id)} onChange={() => toggleSelect(ex.id)}/></td>
                                    <td className="px-6 py-4">{ex.date}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{ex.item}</td>
                                    <td className="px-6 py-4">{ex.amount.toLocaleString()}円</td>
                                    <td className="px-6 py-4">{ex.payer}</td>
                                    <td className="px-6 py-4">真 {ex.ratio} : {10-ex.ratio} 久</td>
                                    <td className="px-6 py-4">{ex.majorCategory}</td>
                                    <td className="px-6 py-4">{ex.subCategory}</td>
                                    <td className="px-6 py-4">{ex.purpose}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredExpenses.length === 0 && <p className="text-center p-10 text-gray-500">この期間のデータはありません。</p>}
                </div>
            </div>
        </div>
    );
}


