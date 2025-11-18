import React, { useState } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import './App.css'; 

const API_URL = `${process.env.REACT_APP_API_URL || "http://127.0.0.1:5000"}/calculate_topology`;

function App() {
  const [numRows, setNumRows] = useState(3); // Number of rows (Nodes - 1)
  const [numCols, setNumCols] = useState(6); // Number of columns (Branches)
  
  const [matrixA, setMatrixA] = useState(
    [[-1, 1, 1, 0, 0, 0],
     [0, -1, 0, 1, 1, 0],
     [0, 0, -1, 0, -1, 1]]
  );

  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- Input Handling Functions ---
  const handleRowsChange = (e) => {
    const newRows = parseInt(e.target.value) || 0;
    setNumRows(newRows);
    resizeMatrix(newRows, numCols);
  };

  const handleColsChange = (e) => {
    const newCols = parseInt(e.target.value) || 0;
    setNumCols(newCols);
    resizeMatrix(numRows, newCols);
  };
  
  const resizeMatrix = (rows, cols) => {
    const newMatrix = Array(rows).fill(0).map(() => Array(cols).fill(0));
    const oldMatrix = matrixA.length > 0 ? matrixA : [];
    const oldRows = oldMatrix.length;
    const oldCols = oldRows > 0 ? oldMatrix[0].length : 0;
    
    for (let i = 0; i < Math.min(rows, oldRows); i++) {
      for (let j = 0; j < Math.min(cols, oldCols); j++) {
        newMatrix[i][j] = oldMatrix[i][j];
      }
    }
    setMatrixA(newMatrix);
  };

  const handleMatrixChange = (val, i, j) => {
    const newMatrix = [...matrixA];
    newMatrix[i][j] = parseFloat(val) || 0;
    setMatrixA(newMatrix);
  };

  const handleSolve = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matrixA: matrixA }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "An unknown error occurred.");
      }
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 🎨 Graph Generation Function ---
  const generateGraphData = () => {
    if (!results) return [];

    const elements = [];
    const treeIndices = results.tree_indices_original || []; // Tree branch indices (1-based)
    
    // 1. Add Nodes
    for (let i = 0; i < numRows; i++) {
      elements.push({ data: { id: `n${i + 1}`, label: `${i + 1}` } });
    }
    // Add Reference Node
    const refNodeId = `n${numRows + 1}`;
    elements.push({ 
      data: { id: refNodeId, label: `${numRows + 1} (Ref)` },
      style: { 'background-color': '#555' } 
    });

    // 2. Add Edges (Branches) based on Matrix A
    for (let j = 0; j < numCols; j++) {
      let source = null;
      let target = null;

      // Scan column j
      for (let i = 0; i < numRows; i++) {
        const val = matrixA[i][j];
        if (val === 1) source = `n${i + 1}`;       // Leaving node
        else if (val === -1) target = `n${i + 1}`; // Entering node
      }

      // If source or target missing, connect to reference node
      if (!source) source = refNodeId;
      if (!target) target = refNodeId;

      // Determine if Tree or Link for styling
      const isTree = treeIndices.includes(j + 1); 

      elements.push({
        data: { 
          source: source, 
          target: target, 
          label: `b${j + 1}` 
        },
        classes: isTree ? 'tree' : 'link'
      });
    }

    return elements;
  };

  return (
    <div className="App">
      <header>
        <h1>CAD Topology Calculator ⚡</h1>
        <p>Tool to calculate topology matrices (B & C) and visualize the graph from Incidence Matrix (A)</p>
      </header>

      <div className="main-layout">
        {/* --- Right Column: Inputs --- */}
        <div className="input-section">
          <div className="card dimensions-card">
            <h3>Matrix A Dimensions</h3>
            <div className="dimension-controls">
              <label>Rows (Nodes-1): <input type="number" value={numRows} onChange={handleRowsChange} min="1" /></label>
              <label>Columns (Branches): <input type="number" value={numCols} onChange={handleColsChange} min="1" /></label>
            </div>
          </div>

          <div className="card">
            <h3>Incidence Matrix (A)</h3>
            <div className="matrix-container">
              <table>
                <thead>
                  <tr>
                    <th>Node</th>
                    {Array(numCols).fill(0).map((_, j) => <th key={j}>b{j + 1}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Array(numRows).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td>n{i + 1}</td>
                      {Array(numCols).fill(0).map((_, j) => (
                        <td key={j}>
                          <input
                            type="number"
                            value={matrixA[i]?.[j] ?? 0}
                            onChange={(e) => handleMatrixChange(e.target.value, i, j)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="solve-section">
            <button onClick={handleSolve} disabled={isLoading}>
              {isLoading ? "Calculating..." : "⚡ Draw & Calculate"}
            </button>
          </div>
          
          {error && <div className="error-card"><h3>Error</h3><p>{error}</p></div>}
        </div>

        {/* --- Left Column: Graph & Results --- */}
        <div className="output-section">
          {results && (
            <>
              {/* --- Graph Area --- */}
              <div className="card graph-card">
                <h3>Topological Graph</h3>
                <div className="graph-legend">
                  <span className="legend-item"><span className="dot tree"></span> Tree</span>
                  <span className="legend-item"><span className="dot link"></span> Link</span>
                </div>
                <CytoscapeComponent
                  elements={generateGraphData()}
                  style={{ width: '100%', height: '400px', backgroundColor: '#f9f9f9' }}
                  layout={{ 
                    name: 'circle', 
                    padding: 50 
                  }}
                  stylesheet={[
                    {
                      selector: 'node',
                      style: {
                        'background-color': '#005a9c',
                        'label': 'data(label)',
                        'color': '#fff',
                        'text-valign': 'center',
                        'text-halign': 'center'
                      }
                    },
                    {
                      selector: 'edge',
                      style: {
                        'width': 3,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'label': 'data(label)',
                        'font-size': '14px',
                        'color': '#333'
                      }
                    },
                    // Tree Style
                    {
                      selector: '.tree',
                      style: {
                        'line-color': '#28a745', // Green
                        'target-arrow-color': '#28a745',
                        'width': 4
                      }
                    },
                    // Link Style
                    {
                      selector: '.link',
                      style: {
                        'line-color': '#dc3545', // Red
                        'target-arrow-color': '#dc3545',
                        'line-style': 'dashed'
                      }
                    }
                  ]}
                />
              </div>

              {/* --- Result Matrices --- */}
              <div className="card">
                <h3>Automatically Selected Tree</h3>
                <p>Tree Branches: <strong>{results.tree_indices_original.map(b => `b${b}`).join(', ')}</strong></p>
                <p>Link Branches: <strong>{results.link_indices_original.map(b => `b${b}`).join(', ')}</strong></p>
              </div>

              <ResultMatrix 
                title="B Matrix (Tie-Set) [Tree | Links]" 
                matrix={results.B_matrix}
                columnLabels={results.column_order}
                rowLabels={Array(results.B_matrix.length).fill(0).map((_, i) => `Loop ${i+1}`)}
              />
              <ResultMatrix 
                title="C Matrix (Cut-Set) [Tree | Links]" 
                matrix={results.C_matrix}
                columnLabels={results.column_order}
                rowLabels={Array(results.C_matrix.length).fill(0).map((_, i) => `Cut ${i+1}`)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Component for displaying matrices
const ResultMatrix = ({ title, matrix, columnLabels, rowLabels }) => (
  <div className="card">
    <h3>{title}</h3>
    <div className="matrix-container">
      <table>
        <thead>
          <tr>
            <th></th>
            {columnLabels.map(label => <th key={label}>{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td><strong>{rowLabels[i]}</strong></td>
              {row.map((val, j) => <td key={j}>{val.toFixed(0)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default App;