import React, { useState, useEffect } from 'react';
import { Settings, Plus, Pencil, Trash2, ChevronDown, Check, Save, X } from 'lucide-react';
import { pqcApi } from '../../api/pqc.api';
import { getOperationMasters } from '../../api/operation-master.api';
import type { PqcQuestionSet, OperationMaster, PqcQuestion, QuestionType } from '../../types/domain.types';
import toast from 'react-hot-toast';

export default function PqcSettingsPage() {
  const [questionSets, setQuestionSets] = useState<PqcQuestionSet[]>([]);
  const [operations, setOperations] = useState<OperationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<Partial<PqcQuestionSet> | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qsRes, opsRes] = await Promise.all([
        pqcApi.getAllQuestionSets(),
        getOperationMasters()
      ]);
      setQuestionSets(qsRes.data);
      setOperations(opsRes.data);
    } catch (error) {
      toast.error('Failed to load settings data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSet({
      name: '',
      inspectionFrequency: '1/Hr',
      questions: [
        { sequenceOrder: 1, questionText: '', questionType: 'PASS_FAIL', isCritical: false }
      ]
    });
    setIsModalOpen(true);
  };

  const handleEdit = (set: PqcQuestionSet) => {
    setEditingSet(JSON.parse(JSON.stringify(set))); // Deep copy
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this question set?')) return;
    try {
      await pqcApi.deleteQuestionSet(id);
      toast.success('Question set deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete question set');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSet?.operationMaster?.id) {
      toast.error('Please select an operation');
      return;
    }
    
    try {
      const payload = {
        operationMasterId: editingSet.operationMaster.id,
        name: editingSet.name,
        inspectionFrequency: editingSet.inspectionFrequency,
        questions: editingSet.questions?.map((q, i) => ({
          ...q,
          sequenceOrder: i + 1,
          choices: q.questionType === 'CHOICE' ? q.choices : null
        }))
      };

      if (editingSet.id) {
        await pqcApi.updateQuestionSet(editingSet.id, payload);
        toast.success('Question set updated');
      } else {
        await pqcApi.createQuestionSet(payload);
        toast.success('Question set created');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save question set');
      console.error(error);
    }
  };

  const addQuestion = () => {
    setEditingSet(prev => {
      if (!prev) return prev;
      const questions = prev.questions || [];
      return {
        ...prev,
        questions: [...questions, { sequenceOrder: questions.length + 1, questionText: '', questionType: 'PASS_FAIL', isCritical: false }]
      };
    });
  };

  const updateQuestion = (index: number, field: keyof PqcQuestion, value: any) => {
    setEditingSet(prev => {
      if (!prev) return prev;
      const questions = [...(prev.questions || [])];
      questions[index] = { ...questions[index], [field]: value };
      return { ...prev, questions };
    });
  };

  const removeQuestion = (index: number) => {
    setEditingSet(prev => {
      if (!prev) return prev;
      const questions = prev.questions?.filter((_, i) => i !== index) || [];
      return { ...prev, questions };
    });
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">PQC Settings</h1>
          <p className="text-gray-500">Manage inspection question sets and PQC configurations</p>
        </div>
        <button 
          onClick={handleCreate}
          className="bg-[var(--pqc-copper)] text-white px-4 py-2 rounded-lg font-medium hover:bg-[var(--pqc-copper-dark)] flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Question Set</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Inspection Question Sets</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Operation</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Set Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Frequency</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Questions</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : questionSets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No question sets configured</td>
                </tr>
              ) : (
                questionSets.map((set) => (
                  <tr key={set.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{set.operationMaster?.operationName || 'N/A'}</div>
                      <div className="text-sm text-gray-500">{set.operationMaster?.operationCode || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">{set.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{set.inspectionFrequency}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {set.questions?.length || 0} questions
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {set.isActive ? (
                        <span className="inline-flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleEdit(set)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(set.id)} className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && editingSet && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900/50" onClick={() => setIsModalOpen(false)} />

            <div className="relative inline-block w-full max-w-4xl p-6 overflow-hidden text-left align-middle transition-all transform bg-[var(--pqc-bone)] shadow-xl rounded-2xl border border-[var(--pqc-copper)]/20">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingSet.id ? 'Edit Question Set' : 'Create Question Set'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSave}>
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Operation Master</label>
                    <select
                      value={editingSet.operationMaster?.id || ''}
                      onChange={(e) => setEditingSet({...editingSet, operationMaster: { id: e.target.value } as any})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--pqc-copper)] focus:border-[var(--pqc-copper)]"
                      required
                    >
                      <option value="">Select Operation...</option>
                      {operations.map(op => (
                        <option key={op.id} value={op.id}>{op.operationName} ({op.operationCode})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Set Name</label>
                    <input
                      type="text"
                      value={editingSet.name}
                      onChange={(e) => setEditingSet({...editingSet, name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--pqc-copper)] focus:border-[var(--pqc-copper)]"
                      placeholder="e.g. Turning Inspection Checklist"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Frequency</label>
                    <input
                      type="text"
                      value={editingSet.inspectionFrequency}
                      onChange={(e) => setEditingSet({...editingSet, inspectionFrequency: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--pqc-copper)] focus:border-[var(--pqc-copper)]"
                      placeholder="e.g. 1/Hr"
                      required
                    />
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-800">Questions</h4>
                  <button type="button" onClick={addQuestion} className="text-[var(--pqc-copper)] font-medium hover:text-[var(--pqc-copper-dark)] flex items-center space-x-1">
                    <Plus className="w-4 h-4" />
                    <span>Add Question</span>
                  </button>
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  {editingSet.questions?.map((q, index) => (
                    <div key={index} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative">
                      <button type="button" onClick={() => removeQuestion(index)} className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-1 rounded-md">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      
                      <div className="flex items-center space-x-2 mb-4 text-[var(--pqc-copper)] font-semibold">
                        <span>Q{index + 1}.</span>
                      </div>

                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-8">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Question Text</label>
                          <input
                            type="text"
                            value={q.questionText}
                            onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-[var(--pqc-copper)] focus:border-[var(--pqc-copper)]"
                            required
                          />
                        </div>
                        <div className="col-span-4">
                          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                          <select
                            value={q.questionType}
                            onChange={(e) => updateQuestion(index, 'questionType', e.target.value as QuestionType)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded-md focus:ring-[var(--pqc-copper)] focus:border-[var(--pqc-copper)]"
                          >
                            <option value="PASS_FAIL">Pass / Fail</option>
                            <option value="NUMERIC">Numeric Entry</option>
                            <option value="TEXT">Text Input</option>
                            <option value="CHOICE">Multiple Choice</option>
                          </select>
                        </div>

                        {q.questionType === 'PASS_FAIL' && (
                          <div className="col-span-4">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Expected Answer</label>
                            <select
                              value={q.expectedAnswer || 'PASS'}
                              onChange={(e) => updateQuestion(index, 'expectedAnswer', e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                            >
                              <option value="PASS">PASS</option>
                              <option value="FAIL">FAIL</option>
                            </select>
                          </div>
                        )}

                        {q.questionType === 'NUMERIC' && (
                          <>
                            <div className="col-span-4">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Min Value</label>
                              <input
                                type="number" step="0.0001"
                                value={q.minValue || ''}
                                onChange={(e) => updateQuestion(index, 'minValue', parseFloat(e.target.value))}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Max Value</label>
                              <input
                                type="number" step="0.0001"
                                value={q.maxValue || ''}
                                onChange={(e) => updateQuestion(index, 'maxValue', parseFloat(e.target.value))}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                              />
                            </div>
                            <div className="col-span-4">
                              <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
                              <input
                                type="text"
                                value={q.unit || ''}
                                onChange={(e) => updateQuestion(index, 'unit', e.target.value)}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                                placeholder="e.g. mm"
                              />
                            </div>
                          </>
                        )}

                        {q.questionType === 'CHOICE' && (
                          <div className="col-span-8">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Choices (comma separated)</label>
                            <input
                              type="text"
                              value={q.choices ? q.choices.join(', ') : ''}
                              onChange={(e) => updateQuestion(index, 'choices', e.target.value.split(',').map(s => s.trim()))}
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-md"
                              placeholder="e.g. Acceptable, Needs Rework, Scrap"
                            />
                          </div>
                        )}

                        <div className="col-span-12 mt-2">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={q.isCritical}
                              onChange={(e) => updateQuestion(index, 'isCritical', e.target.checked)}
                              className="rounded border-gray-300 text-[var(--pqc-copper)] focus:ring-[var(--pqc-copper)]"
                            />
                            <span className="text-sm text-gray-700">Critical Question (failure automatically rejects part)</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!editingSet.questions || editingSet.questions.length === 0) && (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-xl">
                      No questions added yet.
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[var(--pqc-copper)] text-white rounded-lg font-medium hover:bg-[var(--pqc-copper-dark)] flex items-center space-x-2"
                  >
                    <Save className="w-5 h-5" />
                    <span>Save Question Set</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
