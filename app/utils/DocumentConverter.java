package utils;

import com.antigenomics.vdjdb.db.DatabaseSearchResult;
import com.antigenomics.vdjdb.db.Entry;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;

import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.List;

/**
 * Created by bvdmitri on 15.06.16.
 */

public class DocumentConverter {

    private String exportType;

    public DocumentConverter(String exportType) {
        this.exportType = exportType.toLowerCase();
    }

    public String convert(List<DatabaseSearchResult> rows) {
        switch (exportType) {
            case "excel":
                return convertExcel(rows);
            default:
                break;
        }
        return null;
    }

    public static String getTypeExtension(String exportType) {
        switch (exportType) {
            case "excel":
                return ".xls";
            default:
                return "";
        }
    }

    private String convertExcel(List<DatabaseSearchResult> rows) {
        Workbook wb = new HSSFWorkbook();
        Sheet sheet = wb.createSheet("SearchResults");

        if (rows.size() == 0) return null;


        Row headerRow = sheet.createRow(0);
        int cell = 0;
        for (Entry entry : rows.get(0).getRow().getEntries()) {
            if (isVisible(entry)) {
                Cell headerCell = headerRow.createCell(cell);
                headerCell.setCellValue(entry.getColumn().getName());
                cell++;
            }
        }

        int[] sizes = new int[cell];

        int rowCount = 1;
        for (DatabaseSearchResult databaseSearchResult : rows) {
            com.antigenomics.vdjdb.db.Row row = databaseSearchResult.getRow();
            Row rowCell = sheet.createRow(rowCount);
            int entryCount = 0;
            for (Entry entry : row.getEntries()) {
                if (isVisible(entry)) {
                    if (entry.getValue().length() > sizes[entryCount]) sizes[entryCount] = entry.getValue().length();
                    Cell entryCell = rowCell.createCell(entryCount);
                    entryCell.setCellValue(entry.getValue());
                    entryCount++;
                }
            }
            rowCount++;
        }



        for (int i = 0; i < cell; i++) {
            if (sizes[i] > 255) sizes[i] = 255;
            sheet.setColumnWidth(i, sizes[i] * 256);
        }

        String uniqueString = CommonUtils.randomAlphaString(20);
        String outputDirPath = "/tmp/" + uniqueString + "/";
        CommonUtils.createDir(outputDirPath);
        try {
            FileOutputStream fileOutputStream = new FileOutputStream(outputDirPath + "SearchResults.xls");
            wb.write(fileOutputStream);
            fileOutputStream.close();
            return uniqueString;
        } catch (FileNotFoundException e) {
            e.printStackTrace();
            return null;
        } catch (IOException e) {
            e.printStackTrace();
            return null;
        }
    }

    private static Boolean isVisible(Entry entry) {
        return entry.getColumn().getMetadata().containsKey("visible") &&
                entry.getColumn().getMetadata().get("visible").equals("1");
    }

}
