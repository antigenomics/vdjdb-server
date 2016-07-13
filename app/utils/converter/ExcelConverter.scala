package utils.converter
import java.io.FileOutputStream

import org.apache.poi.hssf.usermodel.HSSFWorkbook
import server.database.GlobalDatabase
import server.wrappers.database.RowWrapper
import utils.CommonUtils

/**
  * Created by bvdmitri on 23.06.16.
  */
class ExcelConverter extends DocumentConverter {
  override def convert(rows: List[RowWrapper]): Option[String] = {
    val wb = new HSSFWorkbook()
    val sheet = wb.createSheet("SearchResults")

    if (rows.isEmpty) return null

    val headerRow = sheet.createRow(0)
    var cell = 0

    val sizes = new Array[Int](GlobalDatabase.getColumns.size)

    GlobalDatabase.getColumns.foreach(column => {
      val headerCell = headerRow.createCell(cell)
      headerCell.setCellValue(column.metadata.title)
      sizes(cell) = column.metadata.title.length + 2
      cell += 1
    })

    var rowCount = 1

    rows.foreach(row => {
      val rowCell = sheet.createRow(rowCount)
      var entryCount = 0
      row.entries.foreach(entry => {
        if (entry.value.length > sizes(entryCount)) sizes(entryCount) = entry.value.length + 2
        val entryCell = rowCell.createCell(entryCount)
        entryCell.setCellValue(entry.value)
        entryCount += 1
      })
      rowCount += 1
    })

    sizes.zipWithIndex.foreach {
      case (size, i) => sheet.setColumnWidth(i, if (sizes(i) > 255) 255 * 256 else sizes(i) * 256)
    }

    val uniqueString = CommonUtils.randomAlphaString(20)
    val outputDirPath = "/tmp/" + uniqueString + "/"
    CommonUtils.createDir(outputDirPath)
    try {
      val fileOutputStream = new FileOutputStream(outputDirPath + "SearchResults.xls")
      wb.write(fileOutputStream)
      fileOutputStream.close()
      Some(uniqueString)
    } catch  {
      case e: Exception => None
    }
  }
  override def getExtension : String = ".xls"
}
