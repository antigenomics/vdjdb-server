package graph.Sunburst;

import com.fasterxml.jackson.databind.ObjectMapper;
import graph.Annotations.CachedAnnotations;
import graph.Annotations.RequestTreeSearchParameters;
import graph.Annotations.table.AnnotationRow;
import models.SampleFile;
import play.libs.Json;
import utils.LogUtil;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.PrintWriter;
import java.util.*;

/**
 * Created by bvdmitri on 19.10.15.
 */

public class CachedSunburst {
    public static final String CACHE_FILE_NAME = "sunburst.cache";

    public Sunburst sunburst;

    public CachedSunburst() {}

    public CachedSunburst(Sunburst sunburst) {
        this.sunburst = sunburst;
    }

    public static CachedSunburst cached(SampleFile sampleFile) {
        File cache = new File(sampleFile.getDirectoryPath() + CACHE_FILE_NAME);
        if (cache.exists()) {
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                return objectMapper.readValue(cache, CachedSunburst.class);
            } catch (Exception e) {
                e.printStackTrace();
                LogUtil.warnLog("Warn: unable to open cached annotations for file " + sampleFile.getFileName(), sampleFile.getToken().getUuid());
                return generate(sampleFile);
            }
        }
        return generate(sampleFile);
    }

    private static CachedSunburst generate(SampleFile sampleFile) {
        CachedAnnotations annotations = CachedAnnotations.cached(sampleFile, RequestTreeSearchParameters.getDefaultParameters());
        Map<String, List<AnnotationRow>> map = new HashMap<>();
        Map<String, Sunburst> sunburstMap = new HashMap<>();
        for (AnnotationRow annotationRow : annotations.table.getRows()) {
            String cdr3 = annotationRow.getCdr3().cdr3aa;
            if (map.containsKey(cdr3)) {
                List<AnnotationRow> annotationRows = map.get(cdr3);
                for (AnnotationRow row : annotationRows) {
                    if (!Objects.equals(row.getDisease(), annotationRow.getDisease()) && !Objects.equals(row.getOrigin(), annotationRow.getOrigin())) {
                        annotationRows.add(annotationRow);
                        if (sunburstMap.containsKey(annotationRow.getDisease())) {
                            Sunburst sunburst = sunburstMap.get(annotationRow.getDisease());
                            List<Sunburst> children = sunburst.getChildren();
                            boolean exist = false;
                            for (Sunburst child : children) {
                                if (Objects.equals(child.getName(), annotationRow.getOrigin())) {
                                    exist = true;
                                    child.addFreq(annotationRow.getFreq());
                                    break;
                                }
                            }
                            if (!exist) {
                                Sunburst sunburst1 = new Sunburst(annotationRow.getOrigin(), annotationRow.getFreq());
                                sunburst.addElement(sunburst1);
                            }
                        } else {
                            Sunburst sunburst = new Sunburst(annotationRow.getDisease());
                            Sunburst sunburst1 = new Sunburst(annotationRow.getOrigin(), annotationRow.getFreq());
                            sunburst.addElement(sunburst1);
                            sunburstMap.put(annotationRow.getDisease(), sunburst);
                        }
                    }
                }
            } else {
                List<AnnotationRow> annotationRows = new ArrayList<>();
                annotationRows.add(annotationRow);
                if (sunburstMap.containsKey(annotationRow.getDisease())) {
                    Sunburst sunburst = sunburstMap.get(annotationRow.getDisease());
                    List<Sunburst> children = sunburst.getChildren();
                    boolean exist = false;
                    for (Sunburst child : children) {
                        if (Objects.equals(child.getName(), annotationRow.getOrigin())) {
                            exist = true;
                            child.addFreq(annotationRow.getFreq());
                            break;
                        }
                    }
                    if (!exist) {
                        Sunburst sunburst1 = new Sunburst(annotationRow.getOrigin(), annotationRow.getFreq());
                        sunburst.addElement(sunburst1);
                    }
                } else {
                    Sunburst sunburst = new Sunburst(annotationRow.getDisease());
                    Sunburst sunburst1 = new Sunburst(annotationRow.getOrigin(), annotationRow.getFreq());
                    sunburst.addElement(sunburst1);
                    sunburstMap.put(annotationRow.getDisease(), sunburst);
                }
                map.put(cdr3, annotationRows);
            }
        }
        Sunburst main = new Sunburst("main");
        for (Sunburst sunburst : sunburstMap.values()) {
            main.addElement(sunburst);
        }
        CachedSunburst cachedSunburst = new CachedSunburst(main);
        cachedSunburst.save(sampleFile);
        return cachedSunburst;
    }


    private void save(SampleFile sampleFile) {
        try {
            File cache = new File(sampleFile.getDirectoryPath() + CACHE_FILE_NAME);
            PrintWriter fileWriter = new PrintWriter(cache.getAbsoluteFile());
            fileWriter.write(Json.stringify(Json.toJson(this)));
            fileWriter.close();
        } catch (FileNotFoundException ignored) {
            LogUtil.warnLog("Warn: unable to save cached sunburst for file " + sampleFile.getFileName(), sampleFile.getToken().getUuid());
        }
    }

}
