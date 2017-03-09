package utils.converter

import java.io.FileOutputStream
import server.results.SearchResults
import org.apache.poi.hssf.usermodel.HSSFWorkbook
import org.apache.poi.ss.usermodel.Workbook
import server.database.GlobalDatabase
import server.wrappers.database.RowWrapper
import utils.CommonUtils

/**
  * Created by bvdmitri on 22.06.16.
  */

trait DocumentConverter {
  def convert(searchResults: SearchResults) : Option[String] = None
  def getExtension : String = ".txt"
}

object DocumentConverter {
  def get(exportType: String) : Option[DocumentConverter] = {
    exportType match {
      case "excel" => Some(new ExcelConverter())
      case "csv" => Some(new CSVConverter())
      case _ => None
    }
  }
  def getExtension(exportType: String) : String = {
    exportType match {
      case "excel" => new ExcelConverter().getExtension
      case "csv" => new CSVConverter().getExtension
      case _ => ".txt"
    }
  }
}
