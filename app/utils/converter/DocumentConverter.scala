package utils.converter

import java.io.FileOutputStream

import org.apache.poi.hssf.usermodel.HSSFWorkbook
import org.apache.poi.ss.usermodel.Workbook
import server.database.GlobalDatabase
import server.wrappers.database.RowWrapper
import utils.CommonUtils

/**
  * Created by bvdmitri on 22.06.16.
  */

trait DocumentConverter {
  def convert(rows: List[RowWrapper]) : Option[String] = None
  def getExtension : String = ".txt"
}

object DocumentConverter {
  def get(exportType: String) : Option[DocumentConverter] = {
    exportType match {
      case "excel" => Some(new ExcelConverter())
      case _ => None
    }
  }
  def getExtension(exportType: String) : String = {
    exportType match {
      case "excel" => new ExcelConverter().getExtension
      case _ => ".txt"
    }
  }
}
