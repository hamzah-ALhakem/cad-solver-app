from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import itertools

app = Flask(__name__)
CORS(app)

@app.route("/calculate_topology", methods=["POST"])
def calculate_topology():
    try:
        data = request.json
        A = np.array(data['matrixA'], dtype=float)

        tree_indices, link_indices = find_automatic_tree(A)
        
        # --- الخطوات الجديدة ---
        
        # 1. إنشاء ترتيب الأعمدة الجديد: [الشجرة أولاً | ثم الروابط]
        new_column_indices = np.concatenate((tree_indices, link_indices))
        
        # 2. إنشاء عناوين الأعمدة الجديدة (b1, b5, b3...)
        new_column_labels = [f"b{int(i + 1)}" for i in new_column_indices]
        
        # 3. إعادة ترتيب مصفوفة A الأصلية
        A_reordered = A[:, new_column_indices]
        
        # 4. حساب B و C (الآن ستقوم بإرجاعها مرتبة)
        B_matrix_reordered = calculate_B_matrix(A, tree_indices, link_indices)
        C_matrix_reordered = calculate_C_matrix(A, tree_indices, link_indices)

        return jsonify({
            "message": "Topology calculation successful",
            "column_order": new_column_labels,
            "tree_indices_original": [int(i + 1) for i in tree_indices],
            "link_indices_original": [int(i + 1) for i in link_indices],
            "A_reordered": A_reordered.tolist(),
            "B_matrix": B_matrix_reordered.tolist(), # <- مصفوفة B مرتبة
            "C_matrix": C_matrix_reordered.tolist()  # <- مصفوفة C مرتبة
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400

def find_automatic_tree(A):
    num_nodes_reduced = A.shape[0]
    num_branches = A.shape[1]
    num_tree_branches_needed = num_nodes_reduced
    
    all_possible_column_sets = itertools.combinations(range(num_branches), num_tree_branches_needed)
    
    for column_indices in all_possible_column_sets:
        A_T = A[:, list(column_indices)]
        
        if A_T.shape[0] == A_T.shape[1]:
            det = np.linalg.det(A_T)
            if abs(det) > 1e-9:
                tree_indices = np.array(column_indices)
                all_indices = np.arange(num_branches)
                link_indices = np.setdiff1d(all_indices, tree_indices)
                return tree_indices, link_indices
    
    raise Exception("Invalid Graph Topology: Could not find a valid tree.")

def calculate_B_matrix(A, tree_indices, link_indices):
    """
    يحسب مصفوفة B مرتبة: [B_Tree_Part | B_Link_Part]
    B = [ - (A_T_inv * A_L)^T  |  I_L ]
    """
    A_T = A[:, tree_indices]
    A_L = A[:, link_indices]
    A_T_inv = np.linalg.inv(A_T)
    
    F = A_T_inv @ A_L
    B_T_part = -F.T
    B_L_part = np.identity(len(link_indices))
    
    # بناء المصفوفة B بالترتيب الصحيح [Tree | Links]
    B_reordered = np.hstack((B_T_part, B_L_part))
    return B_reordered

def calculate_C_matrix(A, tree_indices, link_indices):
    """
    يحسب مصفوفة C مرتبة: [C_Tree_Part | C_Link_Part]
    C = [ I_T  |  (A_T_inv * A_L) ]
    """
    A_T = A[:, tree_indices]
    A_L = A[:, link_indices]
    A_T_inv = np.linalg.inv(A_T)
    
    F = A_T_inv @ A_L
    C_T_part = np.identity(len(tree_indices))
    C_L_part = F
    
    # بناء المصفوفة C بالترتيب الصحيح [Tree | Links]
    C_reordered = np.hstack((C_T_part, C_L_part))
    return C_reordered

if __name__ == "__main__":
    app.run(debug=True)