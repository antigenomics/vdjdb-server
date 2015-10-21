package graph.CountPiechart;

import com.antigenomics.vdjdb.core.db.CdrDatabase;
import com.fasterxml.jackson.databind.ObjectMapper;
import graph.Annotations.CachedAnnotations;
import graph.Annotations.RequestTreeSearchParameters;
import graph.Annotations.table.AnnotationRow;
import graph.Sunburst.Sunburst;
import models.SampleFile;
import play.libs.Json;
import utils.LogUtil;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.PrintWriter;
import java.util.*;

/**
 * Created by bvdmitri on 20.10.15.
 */
public class CachedCountPiechart {
    public static final String CACHE_FILE_NAME = "count_pie_chart.cache";

    private CountPiechart piechart;
    private List<UniqueRecord> records;
    private RequestTreeSearchParameters parameters;

    public CachedCountPiechart() {}

    public CachedCountPiechart(CountPiechart piechart, List<UniqueRecord> records, RequestTreeSearchParameters parameters) {
        this.piechart = piechart;
        this.records = records;
        this.parameters = parameters;
    }

    public static CachedCountPiechart cached(SampleFile sampleFile, RequestTreeSearchParameters parameters) {
        File cache = new File(sampleFile.getDirectoryPath() + CACHE_FILE_NAME);
        if (cache.exists()) {
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                CachedCountPiechart cachedCountPiechart = objectMapper.readValue(cache, CachedCountPiechart.class);
                if (parameters.isParametersEquals(cachedCountPiechart.parameters)) {
                    return cachedCountPiechart;
                }
            } catch (Exception e) {
                e.printStackTrace();
                LogUtil.warnLog("Warn: unable to open cached count pie charts for file " + sampleFile.getFileName(), sampleFile.getToken().getUuid());
                return generate(sampleFile, parameters);
            }
        }
        return generate(sampleFile, parameters);
    }

    private static CachedCountPiechart generate(SampleFile sampleFile, RequestTreeSearchParameters parameters) {
        CachedAnnotations annotations = CachedAnnotations.cached(sampleFile, parameters);
        CdrDatabase cdrDatabase = new CdrDatabase();
        int entryCount = cdrDatabase.getEntryCount();
        int sampleCount = sampleFile.getSampleSize();
        CountPiechart countPiechart = new CountPiechart(entryCount, sampleFile.getSampleSize());
        HashMap<AnnotationRow, Integer> bdHitMap = new HashMap<>();
        List<UniqueRecord> records = new ArrayList<>();
        for (AnnotationRow annotationRow : annotations.table.getRows()) {
            if (bdHitMap.containsKey(annotationRow)) {
                bdHitMap.remove(annotationRow);
                bdHitMap.put(annotationRow, 2);
            } else {
                bdHitMap.put(annotationRow, 1);
            }

            boolean recordExists = false;
            for (UniqueRecord record : records) {
                if (record.row.recordEquals(annotationRow)) {
                    recordExists = true;
                    record.hits += 1;
                    record.count += annotationRow.getCount();
                }
            }

            if (!recordExists) {
                records.add(new UniqueRecord(annotationRow, 1, annotationRow.getCount()));
            }

        }
        for (AnnotationRow annotationRow : bdHitMap.keySet()) {
            Integer count = bdHitMap.get(annotationRow);
            PieSector sector = countPiechart.findSectorWithCount(count);
            if (sector == null) {
                sector = new PieSector(count);
                sector.count();
                countPiechart.addSector(sector);
            } else {
                sector.count();
            }
        }
        for (PieSector pieSector : countPiechart.getSectors()) {
            entryCount -= pieSector.getSize();
        }
        countPiechart.addSector(new PieSector(0, entryCount));
        CachedCountPiechart cachedCountPiechart = new CachedCountPiechart(countPiechart, records, parameters);
        cachedCountPiechart.save(sampleFile);
        return cachedCountPiechart;
    }


    private void save(SampleFile sampleFile) {
        try {
            File cache = new File(sampleFile.getDirectoryPath() + CACHE_FILE_NAME);
            PrintWriter fileWriter = new PrintWriter(cache.getAbsoluteFile());
            fileWriter.write(Json.stringify(Json.toJson(this)));
            fileWriter.close();
        } catch (FileNotFoundException ignored) {
            LogUtil.warnLog("Warn: unable to save cached count pie charts for file " + sampleFile.getFileName(), sampleFile.getToken().getUuid());
        }
    }

    public CountPiechart getPiechart() {
        return piechart;
    }

    public RequestTreeSearchParameters getParameters() {
        return parameters;
    }

    public List<UniqueRecord> getRecords() {
        return records;
    }
}
