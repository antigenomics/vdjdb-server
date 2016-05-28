package server

import java.util

import scala.collection.JavaConversions._
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text._
import com.milaboratory.core.tree.TreeSearchParameters
import controllers.SearchAPI

/**
  * Created by bvdmitri on 27.05.16.
  */
case class FiltersParser(textFilters: util.ArrayList[TextFilter], sequenceFilters: util.ArrayList[SequenceFilter], warnings: util.ArrayList[String]) {

  def getWarnings : List[String] = {
    warnings.toList
  }
}

object FiltersParser {
  def parse(text: List[SearchAPI.DatabaseTextFilter], sequence: List[SearchAPI.DatabaseSequenceFilter]) = {
    val warnings : util.ArrayList[String] = new util.ArrayList[String]()
    val textFilters : util.ArrayList[TextFilter] = new util.ArrayList[TextFilter]()
    val columns = GlobalDatabase.getDatabase().getHeader
    text.foreach(filter => {
      if (columns.indexOf(filter.columnId) >= 0) {
        filter.value match {
          case "" =>
            warnings.add("Text filter ignored for " +  filter.columnId + ": empty value field")
          case _ =>
            filter.filterType match {
              case "exact" => textFilters.add(new ExactTextFilter(filter.columnId, filter.value, filter.negative))
              case "pattern" => textFilters.add(new PatternTextFilter(filter.columnId, filter.value, filter.negative))
              case "substring" => textFilters.add(new SubstringTextFilter(filter.columnId, filter.value, filter.negative))
              case "level" => textFilters.add(new LevelFilter(filter.columnId, filter.value, filter.negative))
              case _ =>
                warnings.add("Text filter ignored for " + filter.columnId + ": please select filter type")
            }
        }
      } else {
        warnings.add("Text filter ignored : please select column name")
      }
    })
    val sequenceFilters : util.ArrayList[SequenceFilter] = new util.ArrayList[SequenceFilter]()
    sequence.foreach(filter => {
      filter.columnId match {
        case "cdr3" | "antigen.epitope" =>
          filter.query match {
            case "" =>
              warnings.add("Sequence filter ignored for " + filter.columnId + ": empty query field")
            case _ =>
              val parameters : TreeSearchParameters = new TreeSearchParameters(filter.mismatches, filter.insertions, filter.deletions, filter.mutations)
              sequenceFilters.add(new SequenceFilter(filter.columnId, filter.query, parameters))
          }
        case _  =>
          warnings.add("Sequence filter ignored : please select column name")
      }
    })
    FiltersParser(textFilters, sequenceFilters, warnings)
  }
}
