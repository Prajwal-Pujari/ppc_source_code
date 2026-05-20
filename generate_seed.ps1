$csv = Import-Csv "d:\mes\plug_snap_tolerance.csv"
$lines = @()
foreach ($row in $csv) {
    $rid = $row.tolerance_id
    $sym = $row.sym_value
    $g5 = if($row.grd_5 -eq 'NULL'){'NULL'}else{$row.grd_5}
    $g6 = if($row.grd_6 -eq 'NULL'){'NULL'}else{$row.grd_6}
    $g7 = if($row.grd_7 -eq 'NULL'){'NULL'}else{$row.grd_7}
    $g8 = if($row.grd_8 -eq 'NULL'){'NULL'}else{$row.grd_8}
    $g9 = if($row.grd_9 -eq 'NULL'){'NULL'}else{$row.grd_9}
    $g10 = if($row.grd_10 -eq 'NULL'){'NULL'}else{$row.grd_10}
    $g11 = if($row.grd_11 -eq 'NULL'){'NULL'}else{$row.grd_11}
    $g12 = if($row.grd_12 -eq 'NULL'){'NULL'}else{$row.grd_12}
    $g13 = if($row.grd_13 -eq 'NULL'){'NULL'}else{$row.grd_13}
    $g14 = if($row.grd_14 -eq 'NULL'){'NULL'}else{$row.grd_14}
    $g15 = if($row.grd_15 -eq 'NULL'){'NULL'}else{$row.grd_15}
    $g16 = if($row.grd_16 -eq 'NULL'){'NULL'}else{$row.grd_16}
    $lines += "($rid,'$sym',$g5,$g6,$g7,$g8,$g9,$g10,$g11,$g12,$g13,$g14,$g15,$g16)"
}
$sql = "INSERT INTO is3455_tolerance_values (range_id,sym_value,grd_5,grd_6,grd_7,grd_8,grd_9,grd_10,grd_11,grd_12,grd_13,grd_14,grd_15,grd_16) VALUES`n" + ($lines -join ",`n") + ";"
$sql | Out-File -FilePath "d:\mes\mes-factory\backend\src\main\resources\db\migration\postgres\V15__seed_is3455_values.sql" -Encoding utf8
Write-Host "Generated $($lines.Count) rows"
