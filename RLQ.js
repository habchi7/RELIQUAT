(function() {
    'use strict';

    const stopTime = new Date("2028-10-01T18:48:00+01:00");

    if (new Date() >= stopTime) {
        console.log("⏹ Script");
        return; 
    }
  
/////////////////////////////////////////////////////////////////////////////////////
  
    function wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // Utility: Format date to DD/MM/YYYY
    function formatDate(dateStr) {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            const today = new Date();
            return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
        }
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }
    // Utility: Format number to French format (e.g., 1234.56 -> 1234,56, 1234 -> 1234,00)
    function formatNumber(value) {
        if (value === null || value === undefined || isNaN(parseFloat(value))) {
            return '0,00';
        }
        return parseFloat(value).toFixed(2).replace('.', ',');
    }
    // STEP 1: Extract label-value pairs from .s_dn
    async function extractFromSDN() {
        const dataElements = document.querySelectorAll('.s_dn:not(:empty)');
        const dataArray = [];
        let affaireCounter = 0;
        let clientCounter = 0;
        function findLabel(element) {
            const parent = element.closest('.s_pa');
            if (!parent) return null;
            const dataTop = parent.style.top;
            const dataLeft = parseFloat(parent.style.left) || 0;
            let closestLabel = null;
            let maxLeft = -Infinity;
            const labels = document.querySelectorAll('.s-label');
            for (let label of labels) {
                if (label.style.top === dataTop) {
                    const labelLeft = parseFloat(label.style.left) || 0;
                    if (labelLeft < dataLeft && labelLeft > maxLeft) {
                        maxLeft = labelLeft;
                        closestLabel = label;
                    }
                }
            }
            return closestLabel ? closestLabel.textContent.replace(/ :$/, '').trim() : null;
        }
        dataElements.forEach(element => {
            const value = element.textContent.trim();
            if (value && value !== '&nbsp;') {
                const label = findLabel(element);
                if (label) {
                    dataArray.push({
                        label,
                        value,
                        clientIndex: label === 'Client' ? ++clientCounter : null,
                        affaireIndex: label === 'Affaire' ? ++affaireCounter : null
                    });
                }
            }
        });
        console.log("=== Extracted from .s_dn ===");
        dataArray.forEach(item => {
            if (['Solde', 'Numéro', 'Montant', 'Total Réglé', 'Etablissement', 'Affaire', 'Client'].includes(item.label)) {
                if (item.label === 'Affaire') {
                    console.log(`Affaire-${item.affaireIndex}: ${item.value}`);
                } else if (item.label === 'Client') {
                    console.log(`Client-${item.clientIndex}: ${item.value}`);
                } else {
                    console.log(`${item.label}: ${item.value}`);
                }
            }
        });
        return dataArray;
    }
    // STEP 2: Click "Facture"
    async function clickFacture() {
        const treeItems = document.querySelectorAll('div.swt-tree-item.s_f.s_pr.popup-0');
        for (let item of treeItems) {
            const link = item.querySelector('a.content');
            if (link && link.textContent.trim() === 'Facture') {
                link.click();
                break;
            }
        }
    }
    // STEP 3: Extract from table.s-ttheme
    async function extractFromTable() {
        const rows = document.querySelectorAll('table.s-ttheme tbody tr');
        const dataArray = [];
        const headers = Array.from(document.querySelectorAll('table.s-ttheme thead .header .s_ns.content.s_nwrp'))
            .map(header => header.textContent.trim());
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                const value = cell.textContent.trim();
                if (value && headers[index]) {
                    const label = headers[index];
                    dataArray.push({
                        label,
                        value
                    });
                }
            });
        });
        console.log("=== Extracted from table ===");
        dataArray.forEach(item => {
            if (item.label === 'Date de réception' && !item.value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                console.log(`N° DEF: ${item.value}`);
            }
        });
        return dataArray;
    }
    // STEP 4: Click "Général"
    async function clickGeneral() {
        const treeItems = document.querySelectorAll('div.swt-tree-item.s_f.s_pr.popup-0');
        for (let item of treeItems) {
            const link = item.querySelector('a.content');
            if (link && link.textContent.trim() === 'Général') {
                link.click();
                break;
            }
        }
    }
    // --- Create the main button for table insertion ---
    // Create and style the button for table insertion
    const button = document.createElement('button');
    button.id = 'tableActionBtn';
    Object.assign(button.style, {
        padding: "0px 20px",
        background: "#ffffff",
        color: "#007e45",
        border: "none",
        borderRadius: "6px",
        fontWeight: "400",
        cursor: "pointer",
        textAlign: "center",
        marginTop: "10px",
        fontSize: "16px"
    });
    button.textContent = 'Comptabiliser Reliquat & Complément';
    button.title = 'Click to open the facture processing form';
    // --- Step 7: Insert Button into Table ---
    function insertButton() {
        const table = document.querySelector('table.s_pr.swt-tf.swt-vt.s_db');
        if (!table) {
            console.warn("Table not found for button insertion.");
            return false;
        }
        const lastCell = table.querySelector('tr:first-child td.last') || table.querySelector('tr:first-child td:last-child');
        if (lastCell && !lastCell.contains(button)) {
            lastCell.appendChild(button);
            console.log('✅ Button added inside table.');
            return true;
        }
        return false;
    }
    // Check every 500ms until span is found and button is inserted
    const interval = setInterval(() => {
        const spans = document.querySelectorAll('span.s_ns.caption-text');
        let conditionMet = false;
        spans.forEach(span => {
            if (span.textContent.includes("SBP - Fiche de recouvrement Globale")) {
                conditionMet = true;
            }
        });
        if (conditionMet && insertButton()) {
            clearInterval(interval); // Stop checking after button is added
        }
    }, 230);
    // Button click event to run extraction and show popup
    button.addEventListener('click', async () => {
        // Create and display progress element
        const progressContainer = document.createElement("div");
        progressContainer.id = "progressContainer";
        Object.assign(progressContainer.style, {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: "10001",
            textAlign: "center"
        });
        progressContainer.innerHTML = `
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Line Loader — Bigger</title>
<style>
  body, html {
    height: 100%;
    margin: 0;
    display: grid;
    place-items: center;
    background: #f7f7f7;
  }
  .loader {
    position: relative;
    width: 300px;
    height: 9px;
    background: #ddd;
    overflow: hidden;
    border-radius: 6px;
  }
  .loader::before {
    content: "";
    position: absolute;
    top: 0;
    left: -50%;
    width: 50%;
    height: 100%;
    background: #0a754c;
    animation: moveRight 1.2s linear infinite;
  }
  @keyframes moveRight {
    0% { left: -50%; }
    100% { left: 100%; }
  }
</style>
</head>
<body>
  <div class="loader"></div>
</body>
</html>
        `;
        document.body.appendChild(progressContainer);
        console.log("Progress container displayed");
        // Run extraction steps
        await clickGeneral();
        await wait(500);
        const sdnData = await extractFromSDN();
        await wait(500);
        await clickFacture();
        await wait(500);
        const tableData = await extractFromTable();
        await wait(500);
        await clickGeneral();
        console.log("=== All steps done ===");
        // Remove progress element before showing popup
        const progressElement = document.getElementById("progressContainer");
        if (progressElement) {
            progressElement.remove();
            console.log("Progress container removed");
        }
        // Remove any existing popup
        const existingPopup = document.querySelector('.facture-popup');
        if (existingPopup) existingPopup.remove();
        // Create popup div
        const popup = document.createElement('div');
        popup.className = 'facture-popup';
        Object.assign(popup.style, {
            position: 'fixed',
            top: '50%',
            left: '85%',
            transform: 'translate(-50%, -50%)',
            background: '#2a2a2a',
            padding: '25px 25px 20px 25px',
            borderRadius: '12px',
            boxShadow: '0 6px 12px rgba(0,0,0,0.7)',
            zIndex: '10000',
            width: '400px',
            maxWidth: '90vw',
            height: '960px',
            minWidth: '300px',
            minHeight: '300px',
            fontFamily: "'Segoe UI', Tahoma, sans-serif",
            animation: 'slideInRight 0.3s ease forwards',
            overflow: 'hidden'
        });
        // Create scroll container
        const scrollContainer = document.createElement("div");
        Object.assign(scrollContainer.style, {
            height: '100%',
            overflowY: 'scroll',
            overflowX: 'hidden',
            paddingRight: '0px',
            scrollbarWidth: 'none', /* Firefox */
            msOverflowStyle: 'none', /* IE and Edge */
            /* Webkit browsers */
            WebkitOverflowScrolling: 'touch',
            '-webkit-overflow-scrolling': 'touch'
        });
        scrollContainer.id = "scrollContainer";
        // Add CSS styles to document head
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
            from {
             transform: translate(100%, -50%);
              opacity: 0;
              }
           to {
              transform: translate(-50%, -50%);
             opacity: 1;
               }
             }
            @keyframes slideInRight {
                from {
                    transform: translate(100%, -50%);
                    opacity: 0;
                }
                to {
                    transform: translate(-50%, -50%);
                    opacity: 1;
                }
            }
            .form-wrapper {
                width: 100%;
                height: 100%;
                overflow-y: scroll;
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            .form-wrapper::-webkit-scrollbar {
                display: none;
            }
            #factureForm {
                display: flex;
                flex-direction: column;
                gap: 15px;
                padding-bottom: 10px;
            }
            #factureForm label {
                display: flex;
                flex-direction: column;
                font-size: 14px;
                color: #e0e0e0;
                font-weight: 500;
            }
            #factureForm input, #factureForm select {
                margin-top: 5px;
                padding: 10px;
                border: 1px solid #444;
                border-radius: 5px;
                font-size: 14px;
                background: #3a3a3a;
                color: #e0e0e0;
                transition: border-color 0.3s ease;
                box-sizing: border-box;
                width: 100%;
            }
            #factureForm input:focus, #factureForm select:focus {
                outline: none;
                border-color: #1e90ff;
            }
            #saveBtn, #closeBtn {
                transition: all 0.3s ease;
                margin-top: 5px;
            }
            #saveBtn {
                background: #2e7d32;
                color: #e0e0e0;
            }
            #saveBtn:hover {
                background: #388e3c;
                transform: scale(1.02);
            }
            #closeBtn {
                background: #c62828;
                color: #e0e0e0;
            }
            #closeBtn:hover {
                background: #d32f2f;
                transform: scale(1.02);
            }
            .button-container {
                display: flex;
                justify-content: space-between;
                gap: 12px;
                margin-top: 5px;
                padding-top: 10px;
                border-top: 1px solid #444;
            }
            /* Enhanced scrollbar hiding for all browsers */
            #scrollContainer::-webkit-scrollbar {
                display: none;
                width: 0;
                height: 0;
            }
            #scrollContainer::-webkit-scrollbar-track {
                display: none;
                background: transparent;
            }
            #scrollContainer::-webkit-scrollbar-thumb {
                display: none;
                background: transparent;
            }
            #scrollContainer {
                -ms-overflow-style: none; /* Internet Explorer 10+ */
                scrollbar-width: none; /* Firefox */
                scroll-behavior: smooth;
            }
            /* Touch device scrolling enhancement */
            @media (hover: none) and (pointer: coarse) {
                #scrollContainer {
                    -webkit-overflow-scrolling: touch;
                }
            }
        `;
        document.head.appendChild(style);
        // Set popup content with form
        scrollContainer.innerHTML = `
            <form id="factureForm">
                <label>Établissement:
                    <select name="etablissement" required>
                        <option value="" disabled selected>Select Etablissement</option>
                        <option value="CA">CA</option>
                        <option value="AG">AG</option>
                        <option value="SA">SA</option>
                        <option value="NA">NA</option>
                    </select>
                </label>
                <label>Client:
                    <input type="text" name="client" required>
                </label>
                <label>Code:
                    <input type="text" name="code" required>
                </label>
                <label>Affaire:
                    <input type="text" name="affaire" required>
                </label>
                <label>N°Facture - PROFORMA:
                    <input type="text" name="num_facture_pro" required>
                </label>
                <label>TVA - PROFORMA:
                    <input type="number" name="tva_pro" step="0.01" required>
                </label>
                <label>TSP - PROFORMA:
                    <input type="number" name="tsp_pro" step="0.01" required>
                </label>
                <label>Montant Facture - PROFORMA:
                    <input type="text" name="montant_fac_pro" required>
                </label>
                <label>N°Facture - DEFINITIVE:
                    <input type="text" name="num_facture_def" required>
                </label>
                <label>TVA - DEFINITIVE:
                    <input type="number" name="tva_def" step="0.01" required>
                </label>
                <label>TSP - DEFINITIVE:
                    <input type="number" name="tsp_def" step="0.01" required>
                </label>
                <label>Montant Facture - DEFINITIVE:
                    <input type="number" name="montant_fac_def" step="0.01" required>
                </label>
                <label>Type de remboursement:
                    <select name="type_remboursement" required>
                        <option value="" disabled selected>Select Type</option>
                        <option value="RELIQUAT">RELIQUAT</option>
                        <option value="COMPL">COMPL</option>
                    </select>
                </label>
                <label>Montant du Solde:
                    <input type="text" name="montant_reliquat" required>
                </label>
                <div class="button-container">
                    <button type="submit" id="saveBtn"
                        style="flex: 1; padding: 12px; border: none; border-radius: 8px; cursor: pointer; background-color: #0a754c; font-size: 16px; font-weight: 500; font-family: Arial, sans-serif;">
                        Comptabiliser
                    </button>
                    <button type="button" id="closeBtn"
                        style="flex: 1; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 500; font-family: Arial, sans-serif;">
                        Fermer
                    </button>
                </div>
            </form>
        `;
        popup.appendChild(scrollContainer);
        // Append popup to body
        document.body.appendChild(popup);
        // Populate form fields with extracted data
        const form = scrollContainer.querySelector('#factureForm');
        const etablissementField = form.querySelector('select[name="etablissement"]');
        const clientField = form.querySelector('input[name="client"]');
        const codeField = form.querySelector('input[name="code"]');
        const affaireField = form.querySelector('input[name="affaire"]');
        const numFactureProField = form.querySelector('input[name="num_facture_pro"]');
        const montantFacProField = form.querySelector('input[name="montant_fac_pro"]');
        const tvaProField = form.querySelector('input[name="tva_pro"]');
        const tspProField = form.querySelector('input[name="tsp_pro"]');
        const numFactureDefField = form.querySelector('input[name="num_facture_def"]');
        const tvaDefField = form.querySelector('input[name="tva_def"]');
        const tspDefField = form.querySelector('input[name="tsp_def"]');
        const montantFacDefField = form.querySelector('input[name="montant_fac_def"]');
        const typeRemboursementField = form.querySelector('select[name="type_remboursement"]');
        const montantReliquatField = form.querySelector('input[name="montant_reliquat"]');
        // Map extracted data to form fields
        let affaire1Value = '';
        let client1Value = '';
        let latestClient = '';
        let numeroValue = '';
        let montantDefValue = '';
        let montantProValue = '';
        let etablissementValue = '';
        // Find the last Numéro value matching XXXXXXXXX,XX format for Montant Facture - DEFINITIVE and PROFORMA
        const numeroItems = sdnData.filter(item => item.label === 'Numéro' && item.value.match(/^\d{1,}(?:\s\d{3})*,\d{2}$/));
        const numeroItems1 = sdnData.filter(item => item.label === 'Total Réglé' && item.value.match(/^\d{1,}(?:\s\d{3})*,\d{2}$/));
        if (numeroItems.length > 0) {
            montantDefValue = numeroItems[numeroItems.length - 1].value;
            montantProValue = numeroItems1[numeroItems1.length - 1].value;
        }
        sdnData.forEach(item => {
            if (item.label === 'Etablissement' && ['CA', 'NA', 'SA', 'AG'].includes(item.value)) {
                etablissementValue = item.value;
                etablissementField.value = item.value;
            } else if (item.label === 'Client' && item.clientIndex === 1) {
                client1Value = item.value;
            } else if (item.label === 'Client' && item.clientIndex !== 1) {
                latestClient = item.value;
            } else if (item.label === 'Affaire' && item.affaireIndex === 1) {
                affaire1Value = item.value;
            } else if (item.label === 'Numéro' && item.value.match(/^[A-Z]{2}-20\d{2}\/\d{3,4}$/)) {
                numeroValue = item.value;
            } else if (item.label === 'Solde') {
                montantReliquatField.value = item.value;
            }
        });
        // Assign values to form fields
        codeField.value = client1Value;
        affaireField.value = affaire1Value;
        clientField.value = latestClient || client1Value;
        numFactureProField.value = numeroValue;
        montantFacDefField.value = montantDefValue ? parseFloat(montantDefValue.replace(/\s/g, '').replace(',', '.')).toFixed(2) : '';
        montantFacProField.value = montantProValue ? parseFloat(montantProValue.replace(/\s/g, '').replace(',', '.')).toFixed(2) : '';
        // Set Type de remboursement based on Montant du Solde
        const montantSolde = parseFloat(montantReliquatField.value.replace(/\s/g, '').replace(',', '.')) || 0;
        if (montantSolde < 0) {
            typeRemboursementField.value = 'RELIQUAT';
        } else if (montantSolde > 0) {
            typeRemboursementField.value = 'COMPL';
        } else {
            typeRemboursementField.value = '';
        }
        // Calculate TVA and TSP for DEFINITIVE and PROFORMA
        let tvaDefValue = '';
        let tspDefValue = '';
        let tvaProValue = '';
        let tspProValue = '';
        if (montantDefValue && montantProValue && etablissementValue) {
            const A = parseFloat(montantDefValue.replace(/\s/g, '').replace(',', '.'));
            const X = parseFloat(montantProValue.replace(/\s/g, '').replace(',', '.'));
            let B;
            switch (etablissementValue) {
                case 'CA':
                    B = 0.03;
                    break;
                case 'AG':
                    B = 0.04;
                    break;
                case 'NA':
                    B = 0.01;
                    break;
                case 'SA':
                    B = 0.05;
                    break;
                default:
                    B = 0;
            }
            tspDefValue = ((A / (1 + B)) / 1.2) * B;
            tspDefValue = isNaN(tspDefValue) ? '' : tspDefValue.toFixed(2);
            tvaDefValue = A - (A / (1 + B) / 1.2) - ((A / (1 + B) / 1.2) * B);
            tvaDefValue = isNaN(tvaDefValue) ? '' : tvaDefValue.toFixed(2);
            tspProValue = ((X / 1.2) / (1 + B)) * B;
            tspProValue = isNaN(tspProValue) ? '' : tspProValue.toFixed(2);
            tvaProValue = X - (X / (1 + B) / 1.2) - ((X / (1 + B) / 1.2) * B);
            tvaProValue = isNaN(tvaProValue) ? '' : tvaProValue.toFixed(2);
            console.log(`Calculations: A=${A}, X=${X}, B=${B}, TSP-DEF=${tspDefValue}, TVA-DEF=${tvaDefValue}, TSP-PRO=${tspProValue}, TVA-PRO=${tvaProValue}`);
        }
        // Assign calculated values to form fields
        tvaDefField.value = tvaDefValue;
        tspDefField.value = tspDefValue;
        tvaProField.value = tvaProValue;
        tspProField.value = tspProValue;
        // Map table data for N°Facture - DEFINITIVE
        tableData.forEach(item => {
            if (item.label === 'Date de réception' && !item.value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                numFactureDefField.value = item.value;
            }
        });
        // Handle form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log("Form submitted"); // Debug: Confirm form submission
            const data = Object.fromEntries(new FormData(e.target).entries());
            console.log("Form data:", data); // Debug: Log form data
            // Validate required fields
            const requiredFields = [
                'etablissement', 'client', 'code', 'affaire', 'num_facture_pro',
                'tva_pro', 'tsp_pro', 'montant_fac_pro', 'num_facture_def',
                'tva_def', 'tsp_def', 'montant_fac_def', 'type_remboursement', 'montant_reliquat'
            ];
            const missingFields = requiredFields.filter(field => !data[field] || data[field].trim() === '');
            if (missingFields.length > 0) {
                console.error("Missing required fields:", missingFields);
                alert("Veuillez remplir tous les champs requis.");
                return;
            }
            // Define CSV headers
            const headers = [
                "Etablissement", "DATE", "Journal", "Type de piece", "Compte general",
                "TIERS", "Libelle piece", "N° FACTURE", "Mode paiement", "Type ecriture",
                "MONTANT", "SENS", "Section analytique"
            ];
            // Parse and format amounts for CSV
            const tvaDefNum = parseFloat(data.tva_def || 0);
            const tvaProNum = parseFloat(data.tva_pro || 0);
            const tspDefNum = parseFloat(data.tsp_def || 0);
            const tspProNum = parseFloat(data.tsp_pro || 0);
            const montantFacDefNum = parseFloat(data.montant_fac_def || 0);
            const montantFacProNum = parseFloat(data.montant_fac_pro || 0);
            const montantReliquatNum = parseFloat(data.montant_reliquat.replace(/\s/g, '').replace(',', '.') || 0);
            const formattedMontantFacDef = formatNumber(montantFacDefNum);
            const formattedMontantFacPro = formatNumber(montantFacProNum);
            const formattedTvaDef = formatNumber(tvaDefNum);
            const formattedTspDef = formatNumber(tspDefNum);
            const formattedTvaPro = formatNumber(tvaProNum);
            const formattedTspPro = formatNumber(tspProNum);
            const formattedMontantReliquat = formatNumber(montantReliquatNum);
            const tvaDiffNum = tvaDefNum - tvaProNum;
            const tspDiffNum = tspDefNum - tspProNum;
            const formattedTvaDiff = formatNumber(tvaDiffNum);
            const formattedTspDiff = formatNumber(tspDiffNum);
            // Debug: Log calculations
            console.log(`TVA-DEF: ${tvaDefNum}, TVA-PRO: ${tvaProNum}, TVA-DIFF: ${tvaDiffNum}`);
            console.log(`TSP-DEF: ${tspDefNum}, TSP-PRO: ${tspProNum}, TSP-DIFF: ${tspDiffNum}`);
            // Get today's date
            const today = formatDate(new Date());
            // Common label piece template
            const libellePieceBase = `AFF: ${data.affaire} FP ${data.num_facture_pro} ET FAC ${data.num_facture_def}// ${data.client}`;
            // Generate CSV rows based on type_remboursement
            let rows = [];
            if (data.type_remboursement === 'COMPL') {
                rows = [
                    [
                        data.etablissement, today, 'OPD', 'OD', '342100',
                        data.code, `REGUL. ${libellePieceBase}`, data.affaire, '', 'X',
                        formattedMontantFacDef, 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '342100',
                        data.code, `COMPL. ${libellePieceBase}`, data.affaire, '', 'X',
                        formatNumber(montantReliquatNum), 'D', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '442100',
                        data.code, `REGUL. ${libellePieceBase}`, data.affaire, '', 'X',
                        formattedMontantFacPro, 'D', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '445500',
                        '', `TVA. ${libellePieceBase}`, data.affaire, '', '0',
                        formatNumber(-tvaDefNum), 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '445500',
                        '', `TVA. ${libellePieceBase}`, data.affaire, '', '0',
                        formattedTvaPro, 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '445500',
                        '', `TVA. ${libellePieceBase}`, data.affaire, '', '0',
                        formatNumber(tvaDiffNum), 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '445810',
                        '', `TSP. ${libellePieceBase}`, data.affaire, '', '0',
                        formatNumber(-tspDefNum), 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '445810',
                        '', `TSP. ${libellePieceBase}`, data.affaire, '', '0',
                        formattedTspPro, 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '445810',
                        '', `TSP. ${libellePieceBase}`, data.affaire, '', '0',
                        formatNumber(tspDiffNum), 'C', ''
                    ]
                ];
            } else if (data.type_remboursement === 'RELIQUAT') {
                rows = [
                    [
                        data.etablissement, today, 'OPD', 'OD', '442100',
                        data.code, `REGUL. ${libellePieceBase}`, data.affaire, '', 'X',
                        formattedMontantFacPro, 'D', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '442100',
                        data.code, `RELIQUAT. ${libellePieceBase}`, data.affaire, '', 'X',
                        formatNumber(-montantReliquatNum), 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '342100',
                        data.code, `REGUL. ${libellePieceBase}`, data.affaire, '', 'X',
                        formattedMontantFacDef, 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '445500',
                        '', `TVA. ${libellePieceBase}`, data.affaire, '', '0',
                        formattedTvaPro, 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '445500',
                        '', `TVA. ${libellePieceBase}`, data.affaire, '', '0',
                        formatNumber(-tvaDefNum), 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '445500',
                        '', `TVA. ${libellePieceBase}`, data.affaire, '', '0',
                        formatNumber(tvaDiffNum), 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '445810',
                        '', `TSP. ${libellePieceBase}`, data.affaire, '', '0',
                        formattedTspPro, 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '445810',
                        '', `TSP. ${libellePieceBase}`, data.affaire, '', '0',
                        formatNumber(-tspDefNum), 'C', ''
                    ],
                    [
                        data.etablissement, today, 'OPD', 'OD', '445810',
                        '', `TSP. ${libellePieceBase}`, data.affaire, '', '0',
                        formatNumber(tspDiffNum), 'C', ''
                    ]
                ];
            } else {
                console.error("Invalid type_remboursement:", data.type_remboursement);
                alert("Type de remboursement invalide. Veuillez sélectionner 'RELIQUAT' ou 'COMPL'.");
                return;
            }
            // Generate and download CSV
            const csvContent = [
                '\uFEFF' + headers.join(";"), // Add BOM for UTF-8 encoding
                ...rows.map(row => row.join(";"))
            ].join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const fileName = `${data.type_remboursement} ${data.client} ${data.affaire}.csv`;
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            console.log("Initiating CSV download:", fileName); // Debug: Confirm CSV download
            link.click();
            URL.revokeObjectURL(link.href); // Clean up
            // Simulate F3 key press
            console.log("Simulating F3 key press"); // Debug: Confirm F3 trigger
            document.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'F3',
                code: 'F3',
                keyCode: 114,
                which: 114,
                bubbles: true,
                cancelable: true
            }));
                console.log("Removing popup"); // Debug: Confirm popup removal
                popup.remove();
            // Execute input and anchor click after a delay
            setTimeout(() => {
                console.log("Executing delayed actions"); // Debug: Confirm delay start
                const inputElement = document.querySelector('input[tabindex="1"][type="text"][autocomplete="off"][class="s_edit_input swtFontEdit"][maxlength="32"]');
                const anchorElement = document.querySelector('a[class="s_ns swt-speed-button s_f s_pa"][style="top: 111px; left: 774px; width: 20px; height: 19px; line-height: 19px;"]');
                if (inputElement) {
                    inputElement.focus();
                    inputElement.value = "Importation des écritures comptables & analytiques";
                    console.log("Input value set:", inputElement.value); // Debug: Confirm input value
                    const enterEvent = new KeyboardEvent('keydown', {
                        key: 'Enter',
                        code: 'Enter',
                        keyCode: 13,
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    });
                    inputElement.dispatchEvent(enterEvent);
                    console.log("Enter key event dispatched"); // Debug: Confirm Enter event
                } else {
                    console.error("Input element not found. Selector: input[tabindex='1'][type='text'][autocomplete='off'][class='s_edit_input swtFontEdit'][maxlength='32']");
                }
                if (anchorElement) {
                    anchorElement.click();
                    console.log("Anchor element clicked"); // Debug: Confirm anchor click
                } else {
                    console.error("Anchor element not found. Selector: a[class='s_ns swt-speed-button s_f s_pa'][style='top: 111px; left: 774px; width: 20px; height: 19px; line-height: 19px;']");
                }
                // Remove the popup
                console.log("Removing popup"); // Debug: Confirm popup removal
                popup.remove();
            }, 1000); // 1000ms delay for F3 processing
        });
        // Handle close button
        scrollContainer.querySelector('#closeBtn').addEventListener('click', () => {
            console.log("Removing popup via close button");
            popup.remove();
        });
        // Scroll to top to ensure first fields are visible
        scrollContainer.scrollTop = 0;
    });
    // Fallback: Create floating button if table insertion fails
    // Set up fallback after 10 seconds if table button wasn't inserted
    setTimeout(() => {
        if (!document.getElementById('tableActionBtn')) {
            createFloatingButton();
        }
    }, 10000); 
  
  
/////////////////////////////////////////////////////////////////////////////////////
  
    console.log("✅ Script");
})();
