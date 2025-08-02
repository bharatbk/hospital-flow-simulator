//Imports
import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Dialog } from '@headlessui/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';


//Node configuration section
const nodeConfig = {
  customInput: {
    label: 'Admission',
    emoji: '➡',
    color: 'blue',
    allowDrop: true,
    allowMultiple: false,
    defaultPosition: { x: 100, y: 100 },
    fields: {
      label: { type: 'string', displayName: 'Label', defaultValue: 'New Admission' },
      lambda: { type: 'int', displayName: 'lambda', defaultValue: 5 },
    },
    connect: { source: true, target: false },
    default: true,
    deletable: false,
  },
  customED: {
    label: 'Emergency Department',
    emoji: '🚑',
    color: 'gray',
    allowDrop: true,
    allowMultiple: true,
    fields: {
      label: { type: 'string', displayName: 'Label', defaultValue: 'ED Unit' },
      bedCapacity: { type: 'int', displayName: 'Bed Capacity', defaultValue: 20 },
      avgStay: { type: 'float', displayName: 'Avg. Stay (days)', defaultValue: 0.5 },
      avgStd: { type: 'float', displayName: 'Std. Stay (days)', defaultValue: 0.1 },
    },
    connect: { source: true, target: true },
    default: false,
    deletable: true,
  },
  customICU: {
    label: 'ICU',
    emoji: '📉',
    color: 'purple',
    allowDrop: true,
    allowMultiple: true,
    fields: {
      label: { type: 'string', displayName: 'Label', defaultValue: 'ICU Unit' },
      bedCapacity: { type: 'int', displayName: 'Bed Capacity', defaultValue: 10 },
      avgStay: { type: 'float', displayName: 'Avg. Stay (days)', defaultValue: 3.0 },
      avgStd: { type: 'float', displayName: 'Std. Stay (days)', defaultValue: 0.8 },
    },
    connect: { source: true, target: true },
    default: false,
    deletable: true,
  },
  customSurgery: {
    label: 'Surgery',
    emoji: '🔪',
    color: 'orange',
    allowDrop: true,
    allowMultiple: true,
    fields: {
      label: { type: 'string', displayName: 'Label', defaultValue: 'Surgery Unit' },
      orCapacity: { type: 'int', displayName: 'OR Capacity', defaultValue: 5 },
      avgStay: { type: 'float', displayName: 'Avg. Stay (days)', defaultValue: 1.5 },
      avgStd: { type: 'float', displayName: 'Std. Stay (days)', defaultValue: 0.3 },
    },
    connect: { source: true, target: true },
    default: false,
    deletable: true,

  },
  customDefault: {
    label: 'Unit',
    emoji:'🛏️',
    color: 'green',
    allowDrop: true,
    allowMultiple: true,
    fields: {
      label: { type: 'string', displayName: 'Label', defaultValue: 'General Unit' },
      bedCapacity: { type: 'int', displayName: 'Bed Capacity', defaultValue: 30 },
      avgStay: { type: 'float', displayName: 'Avg. Stay (days)', defaultValue: 2.0 },
      avgStd: { type: 'float', displayName: 'Std. Stay (days)', defaultValue: 0.5 },
    },
    connect: { source: true, target: true },
    default: false,
    deletable: true,

  },
  customOutput: {
    label: 'Discharge',
    emoji: '🚶🏽‍♀️',
    color: 'red',
    allowDrop: true,
    allowMultiple: false,
    defaultPosition: { x: 100, y: 300 },
    fields: {
    },
    connect: { source: false, target: true },
    default: true,
    deletable: false

  },
};

//Custom node
const CustomNode = ({ id, data, type, isConnectable }) => {
  const config = nodeConfig[type];
  if (!config) return null;
  const { color, emoji, label, connect = { source: true, target: true } } = config;

  return (
    <div className={`relative bg-${color}-200 border border-${color}-500 rounded-lg p-4 shadow-md text-center w-48 cursor-pointer`}>

      <div className="flex">
        <div className="rounded-full w-12 h-12 flex justify-center items-center bg-gray-100">
          {emoji}
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold">{label}</div>
          <div className="text-gray-500">{data.label}</div>
        </div>
      </div>

      {connect.target && (
        <Handle
          type="target"
          position={Position.Top}
          className={`w-4 h-4 bg-${color}-600 rounded-full border border-${color}-800`}
          isConnectable={isConnectable}
        />
      )}
      {connect.source && (
        <Handle
          type="source"
          position={Position.Bottom}
          className={`w-4 h-4 bg-${color}-600 rounded-full border border-${color}-800`}
          isConnectable={isConnectable}
        />
      )}
    </div>
  );
};

const nodeTypes = Object.keys(nodeConfig).reduce((acc, type) => {
  acc[type] = (props) => <CustomNode {...props} type={type} />;
  return acc;
}, {});

//Node ID generator
const getId = (() => {
  let id = 0;
  return () => `node_${id++}`;
})();

const ResultsModal = ({ isOpen, onClose, results }) => {
  if (!results) return null;

  const processData = (data) => {
    const patientCounts = {};
    const waitTimes = {};
    const stayTimes = {};
    const events = {};

    data.patient_logs.forEach(patient => {

        const admissionEvent = patient.transactions.find(t => t.node.type === 'customInput');
      const dischargeEvent = patient.transactions.find(t => t.node.type === 'customOutput');

      if (admissionEvent) {
        const timeTick = Math.floor(admissionEvent.exit);
        if (!events[timeTick]) events[timeTick] = { admitted: 0, discharged: 0 };
        events[timeTick].admitted += 1;
      }
      if (dischargeEvent) {
        const timeTick = Math.floor(dischargeEvent.enter);
        if (!events[timeTick]) events[timeTick] = { admitted: 0, discharged: 0 };
        events[timeTick].discharged += 1;
      }

      patient.transactions.forEach(transaction => {
        const { label, enter, exit, queued } = transaction;

        if (transaction.node.type === 'customInput' || transaction.node.type === 'customOutput') return;

        patientCounts[label] = (patientCounts[label] || 0) + 1;

        if (queued) {
            const previousTransaction = patient.transactions.find(t => t.exit <= enter && t !== transaction);
            if (previousTransaction) {
                const wait = enter - previousTransaction.exit;
                waitTimes[label] = (waitTimes[label] || []).concat(wait);
            }
        }

        const stay = exit - enter;
        stayTimes[label] = (stayTimes[label] || []).concat(stay);
      });
    });

    const patientData = Object.entries(patientCounts).map(([label, count]) => ({
      name: label,
      patients: count,
    }));

    const avgWaitTimeData = Object.entries(waitTimes).map(([label, times]) => ({
      name: label,
      avgWaitTime: times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0,
    }));

    const avgStayTimeData = Object.entries(stayTimes).map(([label, times]) => ({
      name: label,
      avgStayTime: times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0,
    }));
    
    //Buggy
    const admissionsDischargesData = Object.entries(events).map(([time, data]) => ({
      time: parseInt(time, 10),
      ...data
    })).sort((a, b) => a.time - b.time);

    const allTimePoints = new Set();
    data.patient_logs.forEach(patient => {
      patient.transactions.forEach(t => {
        allTimePoints.add(Math.floor(t.enter));
        allTimePoints.add(Math.floor(t.exit));
      });
    });
    const sortedTimePoints = [...allTimePoints].sort((a, b) => a - b);
    
    let activePatients = 0;
    const activePatientsData = [];
    const eventLog = {};

    data.patient_logs.forEach(patient => {
      const firstTransaction = patient.transactions[0];
      const lastTransaction = patient.transactions[patient.transactions.length - 1];
      if (firstTransaction && firstTransaction.node.type === 'customInput') {
        const time = Math.floor(firstTransaction.exit);
        if (!eventLog[time]) eventLog[time] = { added: 0, removed: 0 };
        eventLog[time].added++;
      }
      if (lastTransaction && lastTransaction.node.type === 'customOutput') {
        const time = Math.floor(lastTransaction.enter);
        if (!eventLog[time]) eventLog[time] = { added: 0, removed: 0 };
        eventLog[time].removed++;
      }
    });

    const sortedEvents = Object.entries(eventLog).sort(([timeA], [timeB]) => parseInt(timeA, 10) - parseInt(timeB, 10));

    sortedEvents.forEach(([time, event]) => {
      activePatients += event.added;
      activePatients -= event.removed;
      activePatientsData.push({ time: parseInt(time, 10), activePatients });
    });

    return { patientData, avgWaitTimeData, avgStayTimeData, admissionsDischargesData, activePatientsData };
  };

  const { patientData, avgWaitTimeData, avgStayTimeData, admissionsDischargesData, activePatientsData } = processData(results);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">

        <Dialog.Panel className="bg-white p-6 rounded-lg max-w-4xl w-full space-y-6 shadow-lg max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-2xl font-bold">Simulation Results</Dialog.Title>
          <p className="text-gray-600">Simulation Complete! Processed {results.num_patients} patients.</p>

          <div className="space-y-8">


            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Average Length of Stay (Time Units)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={avgStayTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgStayTime" fill="#82ca9d" name="Avg. Stay Time" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Average Wait Time (Time Units)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={avgWaitTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="avgWaitTime" fill="#ffc658" name="Avg. Wait Time" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              Close
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

const MessageModal = ({ isOpen, onClose, title, message }) => (
  <Dialog open={isOpen} onClose={onClose} className="relative z-50">
    <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <Dialog.Panel className="bg-white p-6 rounded max-w-sm w-full space-y-4 shadow-lg">
        <Dialog.Title className="text-lg font-bold">{title}</Dialog.Title>
        <p>{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            OK
          </button>
        </div>
      </Dialog.Panel>
    </div>
  </Dialog>
);


const FlowCanvas = () => {
  const reactFlowWrapper = useRef(null);
  const { project } = useReactFlow();
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [modalNode, setModalNode] = useState(null);
  const [editLabelData, setEditLabelData] = useState({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [message, setMessage] = useState({ isOpen: false, title: '', text: '' });


  useEffect(() => {
    document.title = 'Hospital Flow Simulation';
  }, []);

  useEffect(() => {

    const defaultNodes = Object.entries(nodeConfig)
      .filter(([_, config]) => config.default)
      .map(([type, config]) => {
        const data = Object.fromEntries(
          Object.entries(config.fields).map(([key, fieldMeta]) => [
            key,
            fieldMeta.defaultValue !== undefined ? fieldMeta.defaultValue : '',
          ])
        );
        return {
          id: getId(),
          type,
          position: config.defaultPosition || { x: 0, y: 0 },
          data,
          deletable: config.deletable ?? true,
        };
      });
    setNodes(defaultNodes);
  }, [setNodes]);

  useEffect(() => {
    localStorage.setItem('flow-data', JSON.stringify({ nodes, edges }));
  }, [nodes, edges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      const config = nodeConfig[type];
      if (!config || !config.allowDrop) return;
      if (!config.allowMultiple && nodes.some((n) => n.type === type)) {
          setMessage({ isOpen: true, title: 'Error', text: `Only one ${config.label} node is allowed.` });
          return;
      }

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const defaultData = Object.fromEntries(
        Object.entries(config.fields).map(([key, fieldMeta]) => [
          key,
          fieldMeta.defaultValue !== undefined ? fieldMeta.defaultValue : '',
        ])
      );

      const newNode = {
        id: getId(),
        type,
        position,
        data: defaultData,
        deletable: config.deletable ?? true,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [project, setNodes, nodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleNodeClick = useCallback((_, node) => {
    setModalNode(node);
    const nodeTypeConfig = nodeConfig[node.type];
    const initialEditData = {};
    if (nodeTypeConfig && nodeTypeConfig.fields) {
      Object.entries(nodeTypeConfig.fields).forEach(([key, fieldMeta]) => {
        initialEditData[key] = node.data[key] !== undefined ? node.data[key] : fieldMeta.defaultValue || '';
      });
    }
    setEditLabelData(initialEditData);
  }, []);

  const saveLabel = () => {
    const nodeType = modalNode?.type;
    const config = nodeConfig[nodeType];
    const castedData = {};

    for (const [key, value] of Object.entries(editLabelData)) {
        const fieldType = config.fields[key]?.type;
        if (fieldType === 'int') {
        castedData[key] = parseInt(value, 10);
        } else if (fieldType === 'float') {
        castedData[key] = parseFloat(value);
        } else {
        castedData[key] = value;
        }
  }

  setNodes((nds) =>
    nds.map((n) =>
      n.id === modalNode.id ? { ...n, data: { ...castedData } } : n
    )
  );
  setModalNode(null);
};

  const clearCanvas = () => {
    localStorage.removeItem('flow-data');
    const defaultNodes = Object.entries(nodeConfig)
      .filter(([_, config]) => config.default)
      .map(([type, config]) => {
        const data = Object.fromEntries(
          Object.entries(config.fields).map(([key, fieldMeta]) => [
            key,
            fieldMeta.defaultValue !== undefined ? fieldMeta.defaultValue : '',
          ])
        );
        return {
          id: getId(),
          type,
          position: config.defaultPosition || { x: 0, y: 0 },
          data,
        };
      });
    setNodes(defaultNodes);
    setEdges([]);
  };

  // Simulate
  const simulate = async () => {
    const admission = nodes.find(n => n.type === 'customInput');
    const discharge = nodes.find(n => n.type === 'customOutput');
    if (!admission || !discharge) {
      setMessage({ isOpen: true, title: 'Error', text: 'Simulation requires both an Admission and Discharge node.' });
      return;
    }

    setIsSimulating(true);

    const sources = new Set(edges.map(e => e.source));
    const targets = new Set(edges.map(e => e.target));
    const newEdges = [...edges];

    // Connect unconnected nodes
    for (const node of nodes) {
        if (node.id === admission.id || node.id === discharge.id) continue;
        if (!targets.has(node.id)) {
        newEdges.push({ id: `from-${admission.id}-to-${node.id}`, source: admission.id, target: node.id });
        }
        if (!sources.has(node.id)) {
        newEdges.push({ id: `from-${node.id}-to-${discharge.id}`, source: node.id, target: discharge.id });
        }
    }

    setEdges(newEdges);

    try {
      const res = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodes, edges: newEdges }),
      });

      if (!res.ok) {
        throw new Error('Simulation API failed with status ' + res.status);
      }

      const results = await res.json();
      setSimulationResults(results);
      setShowResultsModal(true);
    } catch (err) {
      console.error('Simulation failed:', err);
      setMessage({ isOpen: true, title: 'Error', text: 'Simulation failed. Please check the console for details.' });
    } finally {
      setIsSimulating(false);
    }
  };


  return (
    <div className="flex h-screen font-sans">

      <div className="w-60 bg-gray-100 border-r border-gray-300 p-4 space-y-4">
        {Object.entries(nodeConfig).map(([type, config]) =>
          config.allowDrop ? (
            <div
              key={type}
              className={`p-2 bg-${config.color}-200 rounded cursor-move text-center`}
              draggable
              onDragStart={(event) =>
                event.dataTransfer.setData('application/reactflow', type)
              }
            >
              {config.emoji} {config.label}
            </div>
          ) : null
        )}

        <button
          onClick={clearCanvas}
          className="mt-10 w-full bg-gray-400 hover:bg-gray-500 text-white py-2 rounded"
        >
          Clear Canvas
        </button>
        <button
          onClick={simulate}
          disabled={isSimulating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSimulating ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : 'Simulate'}
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-grow flex flex-col" ref={reactFlowWrapper}>
        <h1 className="text-2xl font-bold p-4 border-b border-gray-300">
          Hospital Flow Simulation
        </h1>
        <div className="flex-grow">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onInit={setReactFlowInstance}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={handleDrop}
            onDragOver={onDragOver}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <MiniMap />
            <Controls />
            <Background variant="dots" gap={12} size={1} />
          </ReactFlow>
        </div>
      </div>

      <Dialog open={!!modalNode} onClose={() => setModalNode(null)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white p-6 rounded max-w-sm w-full space-y-4 shadow-lg">
            <Dialog.Title className="text-lg font-bold">Edit Node</Dialog.Title>
            {modalNode &&
              Object.entries(nodeConfig[modalNode.type].fields).map(([key, meta]) => (
                <div key={key}>
                  <label className="block text-sm font-medium">{meta.displayName}</label>
                  <input
                    value={editLabelData[key] || ''}
                    onChange={(e) =>
                      setEditLabelData({ ...editLabelData, [key]: e.target.value })
                    }
                    type={meta.type === 'int' || meta.type === 'float' ? 'number' : 'text'}
                     className="w-full border border-gray-300 rounded px-2 py-1"
                    {...(key === 'lambda' ? { min: 0, max: 50 } : {})} 
                  />
                </div>
              ))}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalNode(null)}
                className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={saveLabel}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
      
      <ResultsModal
        isOpen={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        results={simulationResults}
      />

      <MessageModal
        isOpen={message.isOpen}
        onClose={() => setMessage({ isOpen: false, title: '', text: '' })}
        title={message.title}
        message={message.text}
      />
    </div>
  );
};

export default FlowCanvas;