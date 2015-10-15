package graph.Annotations;

import com.antigenomics.vdjdb.browsing.BrowserResult;
import com.antigenomics.vdjdb.browsing.DatabaseBrowser;
import com.antigenomics.vdjdb.core.db.CdrDatabase;
import com.antigenomics.vdjtools.io.SampleFileConnection;
import com.antigenomics.vdjtools.sample.Sample;
import com.antigenomics.vdjtools.sample.metadata.MetadataUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import models.SampleFile;
import models.Token;
import play.libs.Json;
import utils.Configuration;
import utils.LogUtil;
import utils.ServerResponse.errors.ErrorResponse;
import utils.ServerResponse.errors.ServerErrorCode;

import java.io.*;

public class AnnotationGenerator {
    public static final String CACHE_FILE_NAME = "annotation.cache";

    private SampleFile sampleFile;
    public Boolean vMatch;
    public Boolean jMatch;
    public Integer mismatches;
    public Integer deletions;
    public Integer insertions;
    public Integer totalMutations;
    public Annotations table;

    public AnnotationGenerator(SampleFile sampleFile, RequestTreeSearchParameters parameters) {
        this.sampleFile = sampleFile;
        this.vMatch = parameters.vMatch;
        this.jMatch = parameters.jMatch;
        this.insertions = parameters.insertions;
        this.deletions = parameters.deletions;
        this.mismatches = parameters.mismatches;
        this.totalMutations = parameters.totalMutations;
        SampleFileConnection sampleFileConnection  = new SampleFileConnection(sampleFile.getFilePath(), sampleFile.getSoftwareType(), MetadataUtil.createSampleMetadata(MetadataUtil.fileName2id(sampleFile.getFileName())), true, false);
        Sample sample = sampleFileConnection.getSample();
        DatabaseBrowser databaseBrowser = new DatabaseBrowser(parameters.vMatch, parameters.jMatch, parameters.getTreeSearchParameters());
        BrowserResult browserResult = databaseBrowser.query(sample, new CdrDatabase());
        this.table = new Annotations(browserResult);
    }

    public void saveCache() throws FileNotFoundException {
        File cache = new File(sampleFile.getDirectoryPath() + "/" + CACHE_FILE_NAME);
        PrintWriter fileWriter = new PrintWriter(cache.getAbsoluteFile());
        fileWriter.write(Json.stringify(Json.toJson(this)));
        fileWriter.close();
    }

    public static JsonNode cacheToJson(String path) throws Exception {
        File file = new File(path);
        return cacheToJson(file);
    }

    public static JsonNode cacheToJson(File file) throws FileNotFoundException {
        FileInputStream fileInputStream = new FileInputStream(file);
        return Json.parse(fileInputStream);
    }

    public static JsonNode getCachedData(JsonNode request, SampleFile file) throws RuntimeException {
        RequestTreeSearchParameters parameters;
        ObjectMapper objectMapper = new ObjectMapper();
        try {
            parameters = objectMapper.readValue(request.findValue("parameters").traverse(), RequestTreeSearchParameters.class);
            File cache = new File(file.getDirectoryPath() + CACHE_FILE_NAME);
            if (cache.exists()) {
                try {
                    CachedAnnotations cachedAnnotations = objectMapper.readValue(cache, CachedAnnotations.class);
                    if (parameters.isParametersEquals(cachedAnnotations)) {
                        return AnnotationGenerator.cacheToJson(cache);
                    }
                } catch (Exception e) {
                    //TODO
                    e.printStackTrace();
                }
            }
            Integer maxTotalMutations = Configuration.maxTotalMutations;
            if (maxTotalMutations > 0 && parameters.totalMutations > maxTotalMutations) {
                return Json.toJson(new ErrorResponse(ServerErrorCode.MAX_TOTAL_MUTATIONS_ERROR));
            }
            AnnotationGenerator annotationGenerator = new AnnotationGenerator(file, parameters);
            Token user = file.getToken();
            if (user != null) {
                try {
                    annotationGenerator.saveCache();
                } catch (Exception e) {
                    LogUtil.warnLog("Error while saving cache for file " + file.getFileName(), user.getUuid());
                }
            }
            return Json.toJson(annotationGenerator);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException(e);
        }
    }

    public static JsonNode getCachedData(SampleFile file) throws FileNotFoundException {
        File cache = new File(file.getDirectoryPath() + CACHE_FILE_NAME);
        if (cache.exists()) {
            return AnnotationGenerator.cacheToJson(cache);
        }
        return null;
    }
}
