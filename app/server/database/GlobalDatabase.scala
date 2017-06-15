package server.database

import java.io.FileInputStream
import java.util

import com.antigenomics.vdjdb.Util.checkDatabase
import com.antigenomics.vdjdb.VdjdbInstance
import com.antigenomics.vdjdb.db.{Database, SearchResult}
import com.antigenomics.vdjdb.scoring.AlignmentScoring
import com.antigenomics.vdjdb.scoring.SequenceSearcherPreset
import com.antigenomics.vdjdb.scoring.AlignmentScoringProvider
import com.antigenomics.vdjdb.sequence.SequenceFilter
import com.antigenomics.vdjdb.text.{ExactTextFilter, TextFilter}
import com.antigenomics.vdjtools.sample.Sample
import controllers.IntersectionAPI.IntersectParametersRequest
import server.wrappers.database.{ColumnWrapper, IntersectWrapper, PresetWrapper, RowWrapper}
import server.Configuration
import server.wrappers.Filters
import server.wrappers.summary.SummaryStatisticWrapper
import com.antigenomics.vdjdb.scoring.DummyAlignmentScoring
import com.milaboratory.core.tree.TreeSearchParameters

import scala.collection.JavaConversions._
import scala.collection.mutable.ListBuffer

import com.antigenomics.vdjdb.stat.ClonotypeSearchSummary
import play.api.libs.json.Json

/**
  * Created by bvdmitri on 16.03.16.
  */
object GlobalDatabase extends SynchronizedAccess {
  private var db : Synchronized[VdjdbInstance] = null

  def initDatabase(): Unit = {
    if (Configuration.useLocalDatabase) {
      db = Synchronized(new VdjdbInstance(new FileInputStream(Configuration.databasePath + "vdjdb.meta.txt"),
        new FileInputStream(Configuration.databasePath + "vdjdb.txt")))
    } else {
      update()
    }
  }

  def getNumberOfRecords : Int =
    synchronizeRead { implicit lock =>
      db().getDbInstance.getRows.size()
    }

  def search(filters: Filters) : List[RowWrapper] =
    synchronizeRead { implicit lock =>
      val results = db().getDbInstance.search(filters.textFilters, filters.sequenceFilters)
      val buffer = new ListBuffer[RowWrapper]
      results.toList.foreach(result => {
        buffer += RowWrapper.wrap(result.getRow)
      })
      buffer.toList
    }

  def search() : List[RowWrapper] =
    synchronizeRead { implicit lock =>
      search(new Filters())
    }

  def findComplex(complexId: String, gene: String) : Option[RowWrapper] =
    synchronizeRead { implicit lock =>
      val textFilters : util.ArrayList[TextFilter] = new util.ArrayList[TextFilter]()
      textFilters.add(new ExactTextFilter("complex.id", complexId, false))
      textFilters.add(new ExactTextFilter("gene", gene, true))
      val sequenceFilters : util.ArrayList[SequenceFilter] = new util.ArrayList[SequenceFilter]()
      val results = search(new Filters(textFilters, sequenceFilters, List()))
      results.headOption
    }

  case class IntersectDatabaseResult(list: List[IntersectWrapper], summary: SummaryStatisticWrapper)
  object IntersectDatabaseResult {
    implicit val intersectDatabaseResultsWrites = Json.writes[IntersectDatabaseResult]
  }

  def intersect(sample: Sample, filters: Filters, parameters: IntersectParametersRequest) : IntersectDatabaseResult =
    synchronizeRead { implicit lock =>
      val buffer = new ListBuffer[IntersectWrapper]()
      var summary: ClonotypeSearchSummary = null
      val searchResults = db().getDbInstance.search(filters.textFilters, filters.sequenceFilters).asInstanceOf[util.ArrayList[SearchResult]]
      if (searchResults.size() != 0) {
        var preset: SequenceSearcherPreset = new SequenceSearcherPreset()

        if (parameters.presetName == "Hamming") {
          var scoring: AlignmentScoring = DummyAlignmentScoring.INSTANCE;
          if (parameters.scoringName == "v1") {
            scoring = AlignmentScoringProvider.loadScoring("v1")
            val maxMismatches = parameters.maxMismatches
            preset = new SequenceSearcherPreset(new TreeSearchParameters(maxMismatches, 0, 0, maxMismatches), scoring)
          }
        }

        val instance = new VdjdbInstance(Database.create(searchResults)).asClonotypeDatabase(false, false, preset)
        var id = 0
        val intersectedResults = instance.search(sample)
        intersectedResults.keySet().toList.foreach(clonotype => {
          buffer += IntersectWrapper.wrap(id, clonotype, intersectedResults.get(clonotype))
          id += 1
        })

        summary = new ClonotypeSearchSummary(intersectedResults, sample, ClonotypeSearchSummary.FIELDS_STARBURST, instance)
      }
      IntersectDatabaseResult(buffer.toList, SummaryStatisticWrapper.wrap(summary))
    }

  def isParametersValid(parameters: IntersectParametersRequest): Boolean = {

    //TODO
    val maxMutations = 5
    val maxInsertions = 2
    val maxDeletions = 2
    val maxMismatches = 7

    (parameters.maxDeletions <= maxDeletions && parameters.maxDeletions >= 0) &&
      (parameters.maxInsertions <= maxInsertions && parameters.maxInsertions >= 0) &&
        (parameters.maxMismatches <= maxMismatches && parameters.maxMismatches >= 0) &&
         (parameters.maxMutations <= maxMutations && parameters.maxMutations >= 0)
  }

  def isParametersValid(mutations: Int, insertions: Int, deletions: Int, mismatches: Int): Boolean = {
    val maxMutations = 5
    val maxInsertions = 2
    val maxDeletions = 2
    val maxMismatches = 7

    (deletions <= maxDeletions && deletions >= 0) &&
      (insertions <= maxInsertions && insertions >= 0) &&
      (mismatches <= maxMismatches && mismatches >= 0) &&
      (mutations <= maxMutations && mutations >= 0)
  }

  def getColumns: List[ColumnWrapper] =
    synchronizeRead { implicit lock =>
      var buffer = ListBuffer[ColumnWrapper]()
      db().getDbInstance.getColumns.toList.foreach(column => {
        buffer += ColumnWrapper.wrap(column)
      })
      buffer.toList
    }

  def getPresets: List[PresetWrapper] = {
    // var buffer = ListBuffer[PresetWrapper]()
    // for (presetName <- SequenceSearcherPreset.getALLOWED_PRESETS) {
    //   val preset = SequenceSearcherPreset.byName(presetName)
    //   buffer += PresetWrapper.wrap(presetName, preset)
    // }
    // buffer.toList
    var buffer = ListBuffer[PresetWrapper]()
    buffer.toList
  }

  def update() =
    synchronizeReadWrite { implicit lock =>
      if (checkDatabase(true)) {
        db = Synchronized(new VdjdbInstance())
      }
    }
}
