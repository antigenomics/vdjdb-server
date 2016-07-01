package server.results

import play.api.libs.json.Json
import server.database.GlobalDatabase
import server.wrappers.Filters
import server.wrappers.database.RowWrapper

/**
  * Created by bvdmitri on 22.06.16.
  */
class SearchResults(var pageSize: Int, var results: List[RowWrapper]) {
  def this() {
    this(SearchResults.DEFAULT_PAGE_SIZE, List())
  }

  def reinit(filters: Filters): Unit = {
    results = GlobalDatabase.search(filters)
  }

  def getPage(page: Int): List[RowWrapper] = {
    if (page >= 0) {
      var fromIndex: Int = pageSize * page
      fromIndex = if (fromIndex > results.size) results.size else fromIndex
      var toIndex: Int = pageSize * (page + 1)
      toIndex = if (toIndex > results.size) results.size else toIndex
      results.slice(fromIndex, toIndex)
    } else {
      getPage(0)
    }
  }

  def sort(index: Int, sortType: String): Unit = {
    results = results.sortWith((e1, e2) => {
      val v1 = e1.entries(index).value
      val v2 = e2.entries(index).value
      val m = v1 >= v2
      sortType match {
        case "desc" => m
        case "asc" => !m
        case _ => m
      }
    })
  }

}

object SearchResults {
  val DEFAULT_PAGE_SIZE : Int = 100
}
