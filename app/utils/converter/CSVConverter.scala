package utils.converter
import java.io.{File, FileOutputStream, PrintWriter}

import server.database.GlobalDatabase
import server.results.SearchResults
import utils.CommonUtils

/**
  * Created by bvdmitri on 09.03.17.
  */
class CSVConverter extends DocumentConverter {
  override def convert(searchResults: SearchResults): Option[String] = {
    val rows = searchResults.results

    if (rows.isEmpty) return null

    val csv_content = new StringBuilder()

    csv_content.append(GlobalDatabase.getColumns.map(column => column.metadata.title).mkString("", "\t", "\r\n"))
    rows.foreach(row => csv_content.append(row.entries.map(entry => entry.value).mkString("", "\t", "\r\n")))

    val uniqueString = CommonUtils.randomAlphaString(20)
    val outputDirPath = "/tmp/" + uniqueString + "/"
    CommonUtils.createDir(outputDirPath)
    try {
      val pw = new PrintWriter(new File(outputDirPath + "SearchResults" + getExtension))
      pw.write(csv_content.toString())
      pw.close()
      Some(uniqueString)
    } catch  {
      case _: Exception => None
    }
  }

  override def getExtension: String = ".csv"
}
