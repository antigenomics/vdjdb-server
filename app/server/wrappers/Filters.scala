package server.wrappers

import java.util

import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text._
import com.milaboratory.core.tree.TreeSearchParameters
import controllers.SearchAPI
import controllers.SearchAPI.FiltersRequest
import server.database.GlobalDatabase

import scala.collection.JavaConversions._
import scala.collection.mutable.ListBuffer

/**
  * Created by bvdmitri on 27.05.16.
  */
case class Filters(textFilters: util.ArrayList[TextFilter], sequenceFilters: util.ArrayList[SequenceFilter], warnings: List[String]) {
  def this() {
    this(new util.ArrayList[TextFilter](), new util.ArrayList[SequenceFilter](), List())
  }
}

object Filters {
  def parse(filters: FiltersRequest) : Filters = {
    parse(filters.textFilters, filters.sequenceFilters)
  }

  def parse(text: List[SearchAPI.DatabaseTextFilter], sequence: List[SearchAPI.DatabaseSequenceFilter]) : Filters = {
    val warnings = ListBuffer[String]()
    val textFilters : util.ArrayList[TextFilter] = new util.ArrayList[TextFilter]()
    val columns = GlobalDatabase.getColumns()
    text.foreach(filter => {
      if (columns.map(column => column.name).indexOf(filter.columnId) >= 0) {
        filter.value match {
          case "" =>
            warnings += ("Text filter ignored for " +  filter.columnId + ": empty value field")
          case _ =>
            filter.filterType match {
              case "exact" => textFilters.add(new ExactTextFilter(filter.columnId, filter.value, filter.negative))
              case "pattern" => textFilters.add(new PatternTextFilter(filter.columnId, filter.value, filter.negative))
              case "substring" => textFilters.add(new SubstringTextFilter(filter.columnId, filter.value, filter.negative))
              case "level" => textFilters.add(new LevelFilter(filter.columnId, filter.value, filter.negative))
              case _ =>
                warnings += ("Text filter ignored for " + filter.columnId + ": please select filter type")
            }
        }
      } else {
        warnings += "Text filter ignored : please select column name"
      }
    })
    val sequenceFilters : util.ArrayList[SequenceFilter] = new util.ArrayList[SequenceFilter]()
    sequence.foreach(filter => {
      filter.columnId match {
        case "cdr3" | "antigen.epitope" =>
          filter.query match {
            case "" =>
              warnings += ("Sequence filter ignored for " + filter.columnId + ": empty query field")
            case _ =>
              val parameters : TreeSearchParameters = new TreeSearchParameters(filter.mismatches, filter.insertions, filter.deletions, filter.mutations)
              sequenceFilters.add(new SequenceFilter(filter.columnId, filter.query, parameters, -1))
          }
        case _  =>
          warnings += "Sequence filter ignored : please select column name"
      }
    })
    Filters(textFilters, sequenceFilters, warnings.toList)
  }
}
