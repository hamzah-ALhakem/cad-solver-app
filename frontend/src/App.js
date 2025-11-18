import React, { useState } from 'react';
import './App.css'; 

const API_URL = "http://127.0.0.1:5000/calculate_topology";

function App() {
  const [numRows, setNumRows] = useState(3);
  const [numCols, setNumCols] = useState(6);
  
  const [matrixA, setMatrixA] = useState(
    [[-1, 1, 1, 0, 0, 0],
     [0, -1, 0, 1, 1, 0],
     [0, 0, -1, 0, -1, 1]]
  );

  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
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
        body: JSON.stringify({
          matrixA: matrixA,
        }),
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

  return (
    <div className="App">
      <header>
        <h1>CAD Topology Calculator ⚡</h1>
        <p>أداة حساب مصفوفات الطوبولوجيا (B & C) من مصفوفة السقوط (A)</p>
      </header>

      {/* --- قسم المدخلات --- */}
      <div className="input-section">
        <h2>1. المدخلات (Inputs)</h2>
        <div className="card dimensions-card">
          <h3>أبعاد المصفوفة (Dimensions)</h3>
          <div className="dimension-controls">
            <label>
              عدد الصفوف (Nodes - 1):
              <input type="number" value={numRows} onChange={handleRowsChange} min="1" />
            </label>
            <label>
              عدد الأعمدة (Branches):
              <input type="number" value={numCols} onChange={handleColsChange} min="1" />
            </label>
          </div>
        </div>

        <div className="card">
          <h3>مصفوفة السقوط (Incidence Matrix A)</h3>
          <div className="matrix-container">
            <table>
              <thead>
                <tr>
                  <th>Node</th>
                  {Array(numCols).fill(0).map((_, j) => (
                    <th key={j}>b{j + 1}</th>
                  ))}
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
      </div>

      {/* --- زر الحل --- */}
      <div className="solve-section">
        <button onClick={handleSolve} disabled={isLoading}>
          {isLoading ? "...جاري الحساب" : "⚡ احسب (B & C) ورتب المصفوفات"}
        </button>
      </div>

      {/* --- قسم المخرجات --- */}
      <div className="output-section">
        {error && <div className="error-card"><h3>خطأ</h3><p>{error}</p></div>}
        
        {results && (
          <>
            <h2>2. المخرجات (Outputs)</h2>
            
            <div className="card">
              <h3>الشجرة المختارة تلقائياً (Selected Tree)</h3>
              <p>فروع الشجرة (Tree Branches): <strong>{results.tree_indices_original.map(b => `b${b}`).join(', ')}</strong></p>
              <p>الروابط (Link Branches): <strong>{results.link_indices_original.map(b => `b${b}`).join(', ')}</strong></p>
            </div>
            
            {/* عرض المصفوفات المرتبة */}
            <ResultMatrix 
              title="A Matrix (Reordered: Tree | Links)" 
              matrix={results.A_reordered}
              columnLabels={results.column_order}
              rowLabels={Array(numRows).fill(0).map((_, i) => `n${i+1}`)}
            />
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
  );
}

// *** مكون مساعد لعرض المصفوفات (تم تحديثه) ***
const ResultMatrix = ({ title, matrix, columnLabels, rowLabels }) => (
  <div className="card">
    <h3>{title}</h3>
    <div className="matrix-container">
      <table>
        <thead>
          <tr>
            <th></th> {/* خلية فارغة للزاوية */}
            {columnLabels.map(label => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td><strong>{rowLabels[i]}</strong></td> {/* عناوين الصفوف (n1, Loop1, ..) */}
              {row.map((val, j) => (
                <td key={j}>{val.toFixed(4)}</td> 
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default App;