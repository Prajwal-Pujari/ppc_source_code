"""
Control Plan Excel Scraper
===========================
Converts raw customer control plan Excel files into the MES PQC upload format.

Usage:
    python control_plan_scraper.py "path/to/control_plan.xlsx"

Output:
    Creates a new Excel file in the same directory with "_UPLOAD.xlsx" suffix.
"""

import sys
import os
import re
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def detect_layout(ws):
    """
    Detect which column layout this sheet uses by scanning header rows.
    Returns a dict mapping logical field names to column letters.
    """
    # Scan rows 5-50 for header clues
    for row_idx in range(5, 51):
        for col_idx in range(1, ws.max_column + 1):
            val = str(ws.cell(row=row_idx, column=col_idx).value or '').strip().lower()
            if 'product characterist' in val:
                col_letter = openpyxl.utils.get_column_letter(col_idx)
                if col_letter == 'B':
                    return 'layout_b'  # File 2 style
                elif col_letter == 'C':
                    return 'layout_c'  # File 1 style
            if 'spcificat' in val or 'specification /tolerance' in val:
                col_letter = openpyxl.utils.get_column_letter(col_idx)
                if col_letter == 'H':
                    return 'layout_d'  # Sabre style
    # Fallback: check if col B or C has data in typical data rows
    return 'layout_c'


def get_column_map(layout):
    """Return column indices (1-based) for each logical field."""
    if layout == 'layout_b':
        return {
            'sr_no': 1,        # A
            'product_char': 2, # B
            'process_char': 4, # D
            'spec': 6,         # F
            'special_class': 8, # H
            'instrument': 9,   # I
            'sample_size': 11, # K
            'frequency': 12,   # L
        }
    elif layout == 'layout_d':
        return {
            'sr_no': None,
            'product_char': 5,  # E
            'process_char': 6,  # F
            'spec': 8,          # H
            'special_class': 7, # G
            'instrument': 10,   # J
            'sample_size': 11,  # K
            'frequency': 12,    # L
        }
    else:  # layout_c (File 1 style)
        return {
            'sr_no': 1,         # A
            'product_char': 3,  # C
            'process_char': 5,  # E
            'spec': 11,         # K
            'special_class': 8, # H
            'instrument': 15,   # O
            'sample_size': 17,  # Q
            'frequency': 18,    # R
        }


def parse_sheet_name(sheet_name):
    """
    Extract operation number and name from sheet name.
    E.g. "030 Face Turning" -> ("030", "Face Turning")
         "005 Raw Material" -> ("005", "Raw Material")
         "AI" -> ("AI", "AI")
         "AI-203" -> ("AI-203", "AI-203")
    """
    sheet_name = sheet_name.strip()
    match = re.match(r'^(\d{3})\s+(.+)$', sheet_name)
    if match:
        return match.group(1), match.group(2).strip()
    # Try patterns like "AI-203"
    match2 = re.match(r'^(AI[-\d]*)\s*(.*)?$', sheet_name, re.IGNORECASE)
    if match2:
        name = match2.group(2).strip() if match2.group(2) else match2.group(1)
        return match2.group(1), name
    # Try patterns like "OP-230" or "OP-210 & 220"
    match3 = re.match(r'^(OP[-\s&0-9A-Z]+)(.*)?$', sheet_name, re.IGNORECASE)
    if match3:
        # If there's an operation name, extract it. Otherwise just use the whole string
        name = match3.group(2).strip() if match3.group(2) else sheet_name
        # The number part (e.g., OP-230)
        num = match3.group(1).strip()
        return num, name
    return sheet_name, sheet_name


def extract_machine_from_sheet(ws):
    """Extract machine name from the sheet header area."""
    # First, look for a 'Machine, Device' column header in rows 5-15
    mac_col = None
    mac_row = None
    for row_idx in range(5, 15):
        for col_idx in range(1, 10):
            val = str(ws.cell(row=row_idx, column=col_idx).value or '').strip().lower()
            if 'machine' in val and 'device' in val:
                mac_col = col_idx
                mac_row = row_idx
                break
        if mac_col:
            break
            
    if mac_col:
        # Check the rows directly beneath the header for the machine name
        for r in range(mac_row + 1, mac_row + 5):
            val = str(ws.cell(row=r, column=mac_col).value or '').strip()
            if val and val.lower() != 'none':
                return val
    
    # Fallback: look for "Machine : X" or "Machine" in rows 1-50
    for row_idx in range(1, 51):
        for col_idx in range(1, 10):
            val = str(ws.cell(row=row_idx, column=col_idx).value or '').strip()
            val_lower = val.lower()
            
            if 'machine' in val_lower and 'device' not in val_lower and 'operator' not in val_lower and 'check' not in val_lower:
                # Parse: "Machine :   -    CNC M/C"
                match = re.search(r'machine\s*[:\-]+\s*(.+)', val, re.IGNORECASE)
                machine = None
                if match:
                    machine = match.group(1).strip().strip('-').strip()
                    if machine and machine not in [':', '-']:
                        return machine
                
                # Check adjacent cell if the label itself didn't contain the value
                if len(val) < 25: # Just a label like "Machine :"
                    adj = str(ws.cell(row=row_idx, column=col_idx + 1).value or '').strip()
                    if adj and adj.lower() != 'none' and adj not in [':', '-']:
                        return adj
                    
                    # Check cell directly below
                    below = str(ws.cell(row=row_idx + 1, column=col_idx).value or '').strip()
                    if below and below.lower() != 'none' and below not in [':', '-'] and 'machine' not in below.lower():
                        return below
                        
    return None


def extract_tools_from_sheet(ws):
    """Extract tool info from the sheet (usually col L, rows 8-14)."""
    tools = []
    for row_idx in range(8, 15):
        for col_idx in [12, 13, 14]:  # L, M, N columns
            val = str(ws.cell(row=row_idx, column=col_idx).value or '').strip()
            if val and val != '-' and 'tool' in val.lower().replace('&', 'and') or 'insert' in val.lower():
                tools.append(val)
            elif val and re.match(r'^\d\)', val):
                tools.append(val)
    return tools


def parse_spec(spec_str):
    """
    Parse a specification string into (min_val, max_val, text_spec).
    
    Examples:
        "52.9-53.1"        -> (52.9, 53.1, None)
        "0.6-0.8"          -> (0.6, 0.8, None)
        "58-62 HRC"        -> (58.0, 62.0, None)  (unit stripped)
        "2000-3000"        -> (2000.0, 3000.0, None)
        "N6 (0.8Ra)"       -> (None, None, "N6 (0.8Ra)")
        "Burr"             -> (None, None, "Burr")
        "Ø28mm"            -> (None, None, "Ø28mm")
        "SS430F"           -> (None, None, "SS430F")
        "22-28 kg/cm²"     -> (22.0, 28.0, None)
        "30 HRC Min."      -> (30.0, None, None)
        "< 3"              -> (None, 3.0, None)
    """
    if not spec_str or spec_str.strip() in ['-', '', 'None']:
        return None, None, None
    
    spec_str = spec_str.strip()
    
    # Try "MIN - MAX" pattern (with optional units)
    # Match patterns like: "52.9-53.1", "58-62 HRC", "22-28 kg/cm²", "0.08-0.12"
    range_match = re.match(
        r'^([+-]?\d+\.?\d*)\s*[-–to]\s*([+-]?\d+\.?\d*)\s*(.*)$', 
        spec_str, re.IGNORECASE
    )
    if range_match:
        try:
            min_val = float(range_match.group(1))
            max_val = float(range_match.group(2))
            return min_val, max_val, None
        except ValueError:
            pass
    
    # Try "XX Min" pattern
    min_match = re.match(r'^([+-]?\d+\.?\d*)\s*(min\.?|minimum)$', spec_str, re.IGNORECASE)
    if min_match:
        try:
            return float(min_match.group(1)), None, None
        except ValueError:
            pass
    
    # Try "< XX" or "<= XX" pattern (max only)
    lt_match = re.match(r'^[<≤]\s*(\d+\.?\d*)$', spec_str)
    if lt_match:
        try:
            return None, float(lt_match.group(1)), None
        except ValueError:
            pass
    
    # Try "> XX" or ">= XX" pattern (min only)
    gt_match = re.match(r'^[>≥]\s*(\d+\.?\d*)$', spec_str)
    if gt_match:
        try:
            return float(gt_match.group(1)), None, None
        except ValueError:
            pass
    
    # Try plain number
    plain_num = re.match(r'^([+-]?\d+\.?\d*)\s*$', spec_str)
    if plain_num:
        try:
            val = float(plain_num.group(1))
            return val, val, None
        except ValueError:
            pass
    
    # It's a text specification
    return None, None, spec_str


def find_data_start_row(ws, col_map):
    """Find the first data row (after headers) by looking for the first numeric Sr. No., or first product char."""
    if col_map['sr_no'] is None:
        for row_idx in range(8, min(60, ws.max_row + 1)):
            p = ws.cell(row=row_idx, column=col_map['product_char']).value
            if p and str(p).strip() and str(p).strip().lower() not in ['product', 'product characteristics']:
                return row_idx
        return 11
        
    for row_idx in range(12, min(60, ws.max_row + 1)):
        sr_val = ws.cell(row=row_idx, column=col_map['sr_no']).value
        if sr_val is not None:
            try:
                int(str(sr_val).strip())
                return row_idx
            except (ValueError, TypeError):
                pass
    return 18  # fallback


def is_revision_row(ws, row_idx, col_map):
    """Check if a row is a revision history row (at bottom of sheet)."""
    a_val = str(ws.cell(row=row_idx, column=1).value or '').strip().lower()
    
    # Check for typical revision markers
    if a_val in ['rev. no.', 'rev. no', 'date']:
        return True
    
    if a_val in ['sr. no.', 'sr. no']:
        b_val = str(ws.cell(row=row_idx, column=2).value or '').strip().lower()
        if 'rev' in b_val or 'date' in b_val:
            return True
        return False # Just a repeated page header

    if 'work instruction' in a_val or 'classification of charact' in a_val:
        return True
    if 'please refer' in a_val:
        return True
    if a_val.startswith('* '):
        return True  # Marathi/Hindi instructions
    
    # Check if it looks like a date in column C (revision history pattern)
    c_val = str(ws.cell(row=row_idx, column=3).value or '').strip()
    e_val = str(ws.cell(row=row_idx, column=5).value or '').strip().lower()
    if c_val and ('new release' in e_val or 'update' in e_val or 'control plan' in e_val or 'format' in e_val):
        return True
    
    return False


def extract_parameters_from_sheet(ws, col_map):
    """Extract all parameter rows from a sheet."""
    parameters = []
    data_start = find_data_start_row(ws, col_map)
    
    current_product_char = None
    current_sr_no = 0
    
    for row_idx in range(data_start, ws.max_row + 1):
        # Stop if we hit revision history
        if is_revision_row(ws, row_idx, col_map):
            break
        
        sr_val = ws.cell(row=row_idx, column=col_map['sr_no']).value if col_map['sr_no'] else None
        product_char = ws.cell(row=row_idx, column=col_map['product_char']).value if col_map['product_char'] else None
        process_char = ws.cell(row=row_idx, column=col_map['process_char']).value if col_map['process_char'] else None
        spec = ws.cell(row=row_idx, column=col_map['spec']).value if col_map['spec'] else None
        instrument = ws.cell(row=row_idx, column=col_map['instrument']).value if col_map['instrument'] else None
        special = ws.cell(row=row_idx, column=col_map['special_class']).value if col_map['special_class'] else None
        
        # Clean values
        product_char = str(product_char).strip() if product_char else None
        process_char = str(process_char).strip() if process_char else None
        spec = str(spec).strip() if spec else None
        instrument = str(instrument).strip() if instrument else None
        special = str(special).strip() if special else None
        
        # Skip empty rows
        if not product_char and not process_char and not spec:
            continue
            
        # Skip repeated page headers
        if product_char and 'product characterist' in product_char.lower():
            continue
        if process_char and 'process characterist' in process_char.lower():
            continue
        if str(sr_val).strip().lower() in ['sr. no.', 'sr. no']:
            continue
        
        # Skip dashes
        if product_char in ['-', ' -', '']:
            product_char = None
        if process_char in ['-', ' -', '']:
            process_char = None
        if spec in ['-', ' -', '', 'None']:
            spec = None
        if instrument in ['-', ' -', '', 'None']:
            instrument = None
        
        # Track current product characteristic (for multi-row params)
        if col_map['sr_no'] is not None:
            sr_val = ws.cell(row=row_idx, column=col_map['sr_no']).value
            if sr_val is not None:
                try:
                    new_sr = int(str(sr_val).strip())
                    if new_sr != current_sr_no:
                        current_sr_no = new_sr
                        if product_char:
                            current_product_char = product_char
                except (ValueError, TypeError):
                    # Could be a revision row starting with a date
                    continue
            
            # Skip follow-up rows (same parameter, different frequencies)
            # Only take the first occurrence with the spec
            if not sr_val and not product_char and not process_char:
                continue
        else:
            # Layout D: No explicit Sr. No. column, generate it.
            if product_char or process_char:
                current_sr_no += 1
                if product_char:
                    current_product_char = product_char
            else:
                continue # Skip rows with no product or process char
        
        # Determine the parameter name
        param_name = product_char or process_char or current_product_char
        if not param_name:
            continue
        
        # Determine if this is a new distinct parameter
        is_critical = special == '◐' or (special and special not in ['-', ' -'])
        
        min_val, max_val, text_spec = parse_spec(spec)
        
        parameters.append({
            'sr_no': current_sr_no,
            'parameter': param_name,
            'is_product': product_char is not None,
            'is_process': process_char is not None and product_char is None,
            'spec_raw': spec,
            'min_val': min_val,
            'max_val': max_val,
            'text_spec': text_spec,
            'instrument': instrument,
            'is_critical': is_critical,
        })
    
    return parameters


def extract_part_info(wb):
    part_no = 'Unknown'
    part_name = 'Unknown'
    
    for sn in wb.sheetnames:
        ws = wb[sn]
        
        for row_idx in range(2, 10):
            for col_idx in range(1, 20):
                cell_val = str(ws.cell(row=row_idx, column=col_idx).value or '').strip()
                cell_val_lower = cell_val.lower()
                
                if 'part number' in cell_val_lower or 'part no' in cell_val_lower:
                    found = False
                    for c in range(col_idx + 1, min(col_idx + 6, ws.max_column + 1)):
                        v = ws.cell(row=row_idx, column=c).value
                        if v and str(v).strip() and str(v).strip() not in [':', '-'] and 'latest' not in str(v).lower() and 'level' not in str(v).lower():
                            part_no = str(v).strip()
                            found = True
                            break
                    if not found and part_no == 'Unknown':
                        parts = cell_val.split('/')
                        if len(parts) > 2:
                            part_no = parts[-2].strip()
                        elif '-' in cell_val:
                            part_no = cell_val.split('-')[-1].strip()
                        if part_no in [':', '-']:
                            part_no = 'Unknown'
                            
                elif 'part name' in cell_val_lower:
                    found = False
                    for c in range(col_idx + 1, min(col_idx + 6, ws.max_column + 1)):
                        v = ws.cell(row=row_idx, column=c).value
                        if v and str(v).strip() and str(v).strip() not in [':', '-'] and 'description' not in str(v).lower():
                            part_name = str(v).strip()
                            found = True
                            break
                    if not found and part_name == 'Unknown':
                        if '-' in cell_val:
                            part_name = cell_val.split('-')[-1].strip()
                        if part_name in [':', '-']:
                            part_name = 'Unknown'
                            
        if part_no != 'Unknown' and part_name != 'Unknown':
            return part_no, part_name
            
    return part_no, part_name


# ─────────────────────────────────────────────
# Main scraper
# ─────────────────────────────────────────────

def scrape_control_plan(input_file):
    """Main entry point: scrape a control plan Excel and return structured data."""
    
    print(f"\n{'='*60}")
    print(f"  Control Plan Scraper")
    print(f"  Input: {os.path.basename(input_file)}")
    print(f"{'='*60}\n")
    
    wb = openpyxl.load_workbook(input_file, data_only=True)
    
    # Extract part info
    part_no, part_name = extract_part_info(wb)
    print(f"  Part No:   {part_no}")
    print(f"  Part Name: {part_name}")
    print(f"  Sheets:    {len(wb.sheetnames)}")
    print()
    
    all_operations = []
    all_machines = set()
    
    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        op_no, op_name = parse_sheet_name(sheet_name)
        
        # Skip very small sheets or summary sheets
        if ws.max_row < 10:
            print(f"  [!] Skipping '{sheet_name}' (too few rows)")
            continue
        
        # Skip non-operation sheets (cover pages, index sheets, blank sheets)
        # Operation sheets typically start with a 3-digit number like "005", "010", "030"
        # Or they might start with OP- or AI
        is_operation_sheet = (
            bool(re.match(r'^\d{3}\s+', sheet_name.strip())) or
            sheet_name.lower().startswith('ai') or
            sheet_name.lower().startswith('op-')
        )
        if not is_operation_sheet:
            print(f"  [!] Skipping '{sheet_name}' (not an operation sheet)")
            continue
        
        layout = detect_layout(ws)
        col_map = get_column_map(layout)
        
        machine = extract_machine_from_sheet(ws)
        if machine:
            all_machines.add(machine)
        
        parameters = extract_parameters_from_sheet(ws, col_map)
        
        print(f"  +-- {op_no} | {op_name}")
        print(f"  |  Machine: {machine or 'N/A'}")
        print(f"  |  Layout:  {layout}")
        print(f"  |  Parameters: {len(parameters)}")
        for p in parameters:
            spec_display = ''
            if p['min_val'] is not None and p['max_val'] is not None:
                spec_display = f"[{p['min_val']} - {p['max_val']}]"
            elif p['min_val'] is not None:
                spec_display = f"[Min: {p['min_val']}]"
            elif p['max_val'] is not None:
                spec_display = f"[Max: {p['max_val']}]"
            elif p['text_spec']:
                spec_display = f'"{p["text_spec"][:40]}"'
            
            crit = " *CRITICAL*" if p['is_critical'] else ""
            print(f"  |    {p['sr_no']:>2}. {p['parameter'][:35]:<35} {spec_display:<25} {p['instrument'] or ''}{crit}")
        print(f"  +{'-'*55}")
        print()
        
        all_operations.append({
            'op_no': op_no,
            'op_name': op_name,
            'machine': machine,
            'parameters': parameters,
        })
    
    return {
        'part_no': part_no,
        'part_name': part_name,
        'operations': all_operations,
        'machines': list(all_machines),
    }


def write_upload_excel(data, output_file):
    """Write the scraped data into the MES upload Excel format with 3 distinct sheets."""
    
    wb = openpyxl.Workbook()
    
    # Styling
    header_font = Font(name='Inter', bold=True, size=11, color='FFFFFF')
    header_fill = PatternFill(start_color='8B6914', end_color='8B6914', fill_type='solid')
    header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    thin_border = Border(
        left=Side(style='thin', color='CCCCCC'),
        right=Side(style='thin', color='CCCCCC'),
        top=Side(style='thin', color='CCCCCC'),
        bottom=Side(style='thin', color='CCCCCC'),
    )
    data_font = Font(name='Inter', size=10)
    
    def setup_worksheet(ws):
        headers = ['Sr. No.', 'Part No', 'Part Name', 'Machine', 'Cycle Time', 'Operation Sq. No.', 'Parameter', 'MIN', 'MAX', 'Inspection Method']
        for col_idx, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col_idx, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_alignment
            cell.border = thin_border
        
        ws.column_dimensions['A'].width = 8
        ws.column_dimensions['B'].width = 18
        ws.column_dimensions['C'].width = 22
        ws.column_dimensions['D'].width = 25
        ws.column_dimensions['E'].width = 12
        ws.column_dimensions['F'].width = 20
        ws.column_dimensions['G'].width = 35
        ws.column_dimensions['H'].width = 18
        ws.column_dimensions['I'].width = 18
        ws.column_dimensions['J'].width = 25
        ws.freeze_panes = 'A2'

    wb.active.title = 'PQC Question Set'
    sheets_info = {
        'PQC Question Set': {'ws': wb.active, 'row': 2, 'sr': 1, 'first_row': True},
        'Machine Set': {'ws': wb.create_sheet('Machine Set'), 'row': 2, 'sr': 1, 'first_row': True},
        'First Piece Setup Bulk': {'ws': wb.create_sheet('First Piece Setup Bulk'), 'row': 2, 'sr': 1, 'first_row': True}
    }
    
    for info in sheets_info.values():
        setup_worksheet(info['ws'])
    
    total_written = 0
    
    for op in data['operations']:
        for param in op['parameters']:
            
            # Combine all fields to search for instruments "wherever in the first piece setup"
            all_text = " ".join(str(v) for v in param.values() if v).lower()
            
            # Bucketing logic
            if any(t in all_text for t in ['contracer', 'contour tracer', 'vmm', 'cmm', 'cms', 'vms']):
                target = sheets_info['First Piece Setup Bulk']
            elif param.get('is_product'):
                target = sheets_info['PQC Question Set']
            elif param.get('is_process'):
                target = sheets_info['Machine Set']
            else:
                target = sheets_info['PQC Question Set'] # Default fallback
            
            ws = target['ws']
            row_num = target['row']
            
            ws.cell(row=row_num, column=1, value=target['sr']).font = data_font
            
            if target['first_row']:
                ws.cell(row=row_num, column=2, value=data['part_no']).font = data_font
                ws.cell(row=row_num, column=3, value=data['part_name']).font = data_font
                target['first_row'] = False
            
            ws.cell(row=row_num, column=4, value=op.get('machine', '')).font = data_font
            ws.cell(row=row_num, column=5, value="").font = data_font # Cycle Time
            ws.cell(row=row_num, column=6, value=f"{op['op_no']} {op['op_name']}").font = data_font
            ws.cell(row=row_num, column=7, value=param['parameter']).font = data_font
            
            # MIN / MAX
            if param['min_val'] is not None:
                ws.cell(row=row_num, column=8, value=param['min_val']).font = data_font
            elif param['text_spec']:
                ws.cell(row=row_num, column=8, value=param['text_spec']).font = data_font
            
            if param['max_val'] is not None:
                ws.cell(row=row_num, column=9, value=param['max_val']).font = data_font
            
            # Inspection Method
            if param['instrument']:
                ws.cell(row=row_num, column=10, value=param['instrument']).font = data_font
            
            # Apply border
            for col_idx in range(1, 11):
                ws.cell(row=row_num, column=col_idx).border = thin_border
                ws.cell(row=row_num, column=col_idx).alignment = Alignment(vertical='center', wrap_text=True)
            
            target['row'] += 1
            target['sr'] += 1
            total_written += 1
    
    # Add machines sheet
    if data['machines']:
        ws2 = wb.create_sheet('Machines')
        ws2.cell(row=1, column=1, value='Machine Name').font = header_font
        ws2['A1'].fill = header_fill
        ws2.column_dimensions['A'].width = 40
        for i, m in enumerate(data['machines'], 2):
            ws2.cell(row=i, column=1, value=m).font = data_font
    
    try:
        wb.save(output_file)
        print(f"\n{'='*60}")
        print(f"  [OK] Output saved: {output_file}")
        print(f"  Total parameters processed: {total_written}")
        print(f"    - PQC Question Set:       {sheets_info['PQC Question Set']['sr'] - 1}")
        print(f"    - Machine Set:            {sheets_info['Machine Set']['sr'] - 1}")
        print(f"    - First Piece Setup Bulk: {sheets_info['First Piece Setup Bulk']['sr'] - 1}")
        print(f"  Machines found: {', '.join(data['machines']) if data['machines'] else 'None'}")
        print(f"{'='*60}\n")
    except PermissionError:
        print(f"\n{'='*60}")
        print(f"  [ERROR] Cannot save to '{output_file}'!")
        print("  Please CLOSE the file in Excel and try running the script again.")
        print(f"{'='*60}\n")
        sys.exit(1)


# ─────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python control_plan_scraper.py <input_file.xlsx>")
        print("       python control_plan_scraper.py <input_file.xlsx> <output_file.xlsx>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    if not os.path.exists(input_file):
        print(f"Error: File not found: {input_file}")
        sys.exit(1)
    
    # Generate output filename
    if len(sys.argv) >= 3:
        output_file = sys.argv[2]
    else:
        base = os.path.splitext(os.path.basename(input_file))[0]
        # Clean up filename
        clean_name = re.sub(r'[^\w\s-]', '', base).strip().replace(' ', '_')
        output_file = os.path.join(os.path.dirname(input_file) or '.', f"{clean_name}_UPLOAD.xlsx")
    
    data = scrape_control_plan(input_file)
    write_upload_excel(data, output_file)
