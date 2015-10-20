package graph.Annotations;

import com.antigenomics.vdjdb.browsing.BrowserResult;
import com.antigenomics.vdjdb.browsing.DatabaseBrowser;
import com.antigenomics.vdjdb.core.db.CdrDatabase;
import com.antigenomics.vdjtools.io.SampleFileConnection;
import com.antigenomics.vdjtools.sample.Sample;
import com.antigenomics.vdjtools.sample.metadata.MetadataUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import models.SampleFile;
import play.libs.Json;
import utils.LogUtil;

import java.io.File;
import java.io.FileNotFoundException;
import java.io.PrintWriter;

/**
 * Created by bvdmitri on 14.10.15.
 */
public class CachedAnnotations {
    public static final String CACHE_FILE_NAME = "annotation.cache";

    public Annotations table;
    public RequestTreeSearchParameters parameters;

    public CachedAnnotations() {}

    public CachedAnnotations(Annotations annotations, RequestTreeSearchParameters parameters) {
        this.parameters = parameters;
        this.table = annotations;
    }

    public static CachedAnnotations cached(SampleFile sampleFile, RequestTreeSearchParameters parameters) {
        File cache = new File(sampleFile.getDirectoryPath() + CACHE_FILE_NAME);
        if (cache.exists()) {
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                CachedAnnotations cachedAnnotations = objectMapper.readValue(cache, CachedAnnotations.class);
                if (parameters.isParametersEquals(cachedAnnotations.parameters)) {
                    return cachedAnnotations;
                }
            } catch (Exception e) {
                e.printStackTrace();
                LogUtil.warnLog("Warn: unable to open cached annotations for file " + sampleFile.getFileName(), sampleFile.getToken().getUuid());
                return generate(sampleFile, parameters);
            }
        }
        return generate(sampleFile, parameters);
    }

    private static CachedAnnotations generate(SampleFile sampleFile, RequestTreeSearchParameters parameters) {
        SampleFileConnection sampleFileConnection  = new SampleFileConnection(sampleFile.getFilePath(), sampleFile.getSoftwareType(), MetadataUtil.createSampleMetadata(MetadataUtil.fileName2id(sampleFile.getFileName())), true, false);
        Sample sample = sampleFileConnection.getSample();
        DatabaseBrowser databaseBrowser = new DatabaseBrowser(parameters.vMatch, parameters.jMatch, parameters.getTreeSearchParameters());
        BrowserResult browserResult = databaseBrowser.query(sample, new CdrDatabase());
        Annotations annotations = new Annotations(browserResult);
        CachedAnnotations cachedAnnotations = new CachedAnnotations(annotations, parameters);
        cachedAnnotations.save(sampleFile);
        return cachedAnnotations;
    }

    private void save(SampleFile sampleFile) {
        try {
            File cache = new File(sampleFile.getDirectoryPath() + CACHE_FILE_NAME);
            PrintWriter fileWriter = new PrintWriter(cache.getAbsoluteFile());
            fileWriter.write(Json.stringify(Json.toJson(this)));
            fileWriter.close();
        } catch (FileNotFoundException ignored) {
            LogUtil.warnLog("Warn: unable to save cached annotations for file " + sampleFile.getFileName(), sampleFile.getToken().getUuid());
        }
    }

}
