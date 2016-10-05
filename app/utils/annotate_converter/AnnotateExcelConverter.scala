package utils.annotate_converter
import java.io.FileOutputStream
import server.results.IntersectResults
import org.apache.poi.hssf.usermodel.HSSFWorkbook
import server.database.GlobalDatabase
import server.wrappers.database.RowWrapper
import utils.CommonUtils

/**
  * Created by bvdmitri on 05.10.16.
  */
class AnnotateExcelConverter extends AnnotateDocumentConverter {
  override def convert(fileName: String, intersectResults: IntersectResults): Option[String] = {
    intersectResults.results.get(fileName) match {
      case Some(list) =>
        if (list.isEmpty) {
          None
        } else {
          val wb = new HSSFWorkbook()
          val sheet = wb.createSheet("IntersectResults")
          val headerRow = sheet.createRow(0)
          var cell = 0
          val columns = GlobalDatabase.getColumns

          // + additional columns = (Sample)
          val columnsCount = columns.size + 5
          var sizes = new Array[Int](columnsCount)

          //CDR3 (Sample) column
          val column1 = headerRow.createCell(cell)
          column1.setCellValue("CDR3 (Sample)")
          sizes(cell) = "CDR3 (Sample)".length + 2
          cell += 1

          //V (Sample) column
          val column2 = headerRow.createCell(cell)
          column2.setCellValue("V (Sample)")
          sizes(cell) = "V (Sample)".length + 2
          cell += 1

          //J (Sample) column
          val column3 = headerRow.createCell(cell)
          column3.setCellValue("J (Sample)")
          sizes(cell) = "J (Sample)".length + 2
          cell += 1

          //Count (Sample) column
          val column4 = headerRow.createCell(cell)
          column4.setCellValue("Count (Sample)")
          sizes(cell) = "Count (Sample)".length + 2
          cell += 1

          //Freq (Sample) column
          val column5 = headerRow.createCell(cell)
          column5.setCellValue("Freq (Sample)")
          sizes(cell) = "Freq (Sample)".length + 2
          cell += 1

          columns.foreach(column => {
            val headerCell = headerRow.createCell(cell)
            headerCell.setCellValue(column.metadata.title)
            sizes(cell) = column.metadata.title.length + 2
            cell += 1
          })

          var rowCount = 1

          list.foreach(intersect => {
            val cdr3aa_file = intersect.clonotype.cdr.cdr3aa
            val v_file = intersect.clonotype.v
            val j_file = intersect.clonotype.j
            val count_file = intersect.clonotype.count
            val freq_file = intersect.clonotype.freq

            intersect.alignmentHelperList.foreach(helper => {
              val rowCell = sheet.createRow(rowCount)
              var entryCount = 0

              //Create CDR3 (File) entry value
              if (cdr3aa_file.length > sizes(entryCount)) sizes(entryCount) = cdr3aa_file.length + 2
              val cdr3aaFileCell = rowCell.createCell(entryCount)
              cdr3aaFileCell.setCellValue(cdr3aa_file)
              entryCount += 1

              //Create V (File) entry value
              if (v_file.length > sizes(entryCount)) sizes(entryCount) = v_file.length + 2
              val vFileCell = rowCell.createCell(entryCount)
              vFileCell.setCellValue(v_file)
              entryCount += 1

              //Create J (File) entry value
              if (j_file.length > sizes(entryCount)) sizes(entryCount) = j_file.length + 2
              val jFileCell = rowCell.createCell(entryCount)
              jFileCell.setCellValue(j_file)
              entryCount += 1

              //Create Count (File) entry value
              if (count_file.toString.length > sizes(entryCount)) sizes(entryCount) = count_file.toString.length + 2
              val countFileCell = rowCell.createCell(entryCount)
              countFileCell.setCellValue(count_file.toString)
              entryCount += 1

              //Create Freq (File) entry value
              if (freq_file.toString.length > sizes(entryCount)) sizes(entryCount) = freq_file.toString.length + 2
              val freqFileCell = rowCell.createCell(entryCount)
              freqFileCell.setCellValue(freq_file.toString)
              entryCount += 1

              helper.row.entries.foreach(entry => {
                if (entry.value.length > sizes(entryCount)) sizes(entryCount) = entry.value.length + 2
                val entryCell = rowCell.createCell(entryCount)
                entryCell.setCellValue(entry.value)
                entryCount += 1
              })
              rowCount += 1
            })

            val blankRow = sheet.createRow(rowCount)
            for (i <- 1 to columnsCount) {
              val blankCell = blankRow.createCell(i)
              blankCell.setCellValue(" ")
            }
            rowCount += 1
          })

          sizes.zipWithIndex.foreach {
            case (size, i) => sheet.setColumnWidth(i, if (sizes(i) > 255) 255 * 256 else sizes(i) * 256)
          }

          val uniqueString = CommonUtils.randomAlphaString(20)
          val outputDirPath = "/tmp/" + uniqueString + "/"
          CommonUtils.createDir(outputDirPath)
          try {
            val fileOutputStream = new FileOutputStream(outputDirPath + "IntersectResults.xls")
            wb.write(fileOutputStream)
            fileOutputStream.close()
            Some(uniqueString)
          } catch  {
            case e: Exception => None
          }
        }
      case None =>
        None
    }
  }
  override def getExtension : String = ".xls"
}
