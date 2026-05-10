import numpy as np

def mchnn_matching(I_test, W, E, theta=0, max_iters=50):
    """
    Algorithm 3: MC-HNN Matching Phase
    I_test: Bipolar vector (900,)
    W: List of etalon arrays
    E: List of ideal stored energies
    """
    P = len(W)
    n = len(I_test)
    SE = np.zeros(P)
    
    # 1. Calculate Initial Energy (SE) for all Etalon Arrays
    for p in range(P):
        W_p = W[p]
        SE[p] = -0.5 * np.sum(np.outer(I_test, I_test) * W_p)
        
    min_SE = np.min(SE)
    candidate_indices = np.where(SE == min_SE)[0]
    final_candidates = []
    
    # 2. Asynchronous Update on memory giving minimum SE
    for p in candidate_indices:
        W_p = W[p]
        O = I_test.copy()
        
        converged = False
        iters = 0
        
        while not converged and iters < max_iters:
            O_prev = O.copy()
            random_order = np.random.permutation(n)
            
            for i in random_order:
                Onet_i = I_test[i] + np.dot(W_p[i, :], O)
                if Onet_i > theta:
                    O[i] = 1
                elif Onet_i < theta:
                    O[i] = -1
                else:
                    O[i] = 0
            
            if np.array_equal(O, O_prev):
                converged = True
            iters += 1
            
        SE1_p = -0.5 * np.sum(np.outer(O, O) * W_p)
        
        # 3. Check stability
        if np.isclose(SE1_p, E[p]):
            final_candidates.append({'id': p, 'output': O, 'SE1': SE1_p})
            
    # Return results
    if len(final_candidates) == 0:
        return "Access Denied", None, min_SE
    elif len(final_candidates) == 1:
        return final_candidates[0]['id'], final_candidates[0]['output'], min_SE
    else:
        # Conflict resolution via Hamming Distance
        min_hd = float('inf')
        best_p = -1
        best_output = None
        for cand in final_candidates:
            O_cand = cand['output']
            hd = np.sum(I_test != O_cand) 
            if hd < min_hd:
                min_hd = hd
                best_p = cand['id']
                best_output = O_cand
        return best_p, best_output, min_SE
