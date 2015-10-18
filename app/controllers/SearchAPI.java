package controllers;

import com.antigenomics.vdjdb.DatabaseSearcher;
import com.antigenomics.vdjdb.filters.Filter;
import com.antigenomics.vdjdb.filters.FuzzyFilter;
import com.antigenomics.vdjdb.filters.MatchFilter;
import com.antigenomics.vdjdb.filters.PatternFilter;
import com.antigenomics.vdjdb.models.CdrEntrySetDB;
import com.antigenomics.vdjdb.models.EntryDB;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import models.Token;
import play.libs.F;
import play.libs.Json;
import play.mvc.Controller;
import play.mvc.Result;
import utils.LogUtil;
import utils.ServerResponse.errors.ErrorResponse;
import utils.ServerResponse.errors.ServerErrorCode;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class SearchAPI extends Controller {
    private static final String API_VERSION = "v1";
    private static final String DB_NAME = "vdjdb";
    private static final String DB_USER_NAME = "postgres";
    private static final String DB_USER_PASSWORD = "postgres";



    public static class SearchFilter {
        public String type;
        public String field;
        public String value;
        public boolean match;
        public int distance;
    }

    public static class SearchParameters {
        public String token;
        public List<SearchFilter> filters;
    }

    public static class SearchResponse {

    }

    private static Filter convertFilter(SearchFilter searchFilter) {
        switch (searchFilter.type) {
            case "match":
                return new MatchFilter(searchFilter.field, searchFilter.value, searchFilter.match);
            case "pattern":
                return new PatternFilter(searchFilter.field, searchFilter.value, searchFilter.match);
            case "fuzzy":
                return new FuzzyFilter(searchFilter.field, searchFilter.value, searchFilter.distance);
        }
        System.out.println("Filter " + searchFilter.type + " skipped");
        return null;
    }

    private static List<Filter> convertFilters(List<SearchFilter> searchFilters) {
        List<Filter> filters = new ArrayList<>();
        if (searchFilters != null) {
            for (SearchFilter searchFilter : searchFilters) {
                Filter filter = convertFilter(searchFilter);
                if (filter != null)
                    filters.add(filter);
            }
        }
        return filters;
    }

    public static F.Promise<Result> getAvailableFields() {
        return F.Promise.promise(new F.Function0<Result>() {
            @Override
            public Result apply() throws Throwable {
                List<List<String>> fields = new ArrayList<>();
                for (CdrEntrySetDB.Fields setEntryField : CdrEntrySetDB.Fields.values()) {
                    if (!setEntryField.getFieldName().contains("id"))
                        fields.add(Arrays.asList(setEntryField.getFieldName(), setEntryField.getName()));
                }
                for (EntryDB.Fields entryField : EntryDB.Fields.values()) {
                    if (!entryField.getFieldName().contains("id"))
                        fields.add(Arrays.asList(entryField.getFieldName(), entryField.getName()));
                }
                return ok(Json.toJson(fields));
            }
        });
    }

    public static F.Promise<Result> search() {
        return F.Promise.promise(new F.Function0<Result>() {
            @Override
            public Result apply() throws Throwable {
                JsonNode request = request().body().asJson();
                SearchParameters searchParameters;
                try {
                    ObjectMapper objectMapper = new ObjectMapper();
                    searchParameters = objectMapper.convertValue(request, SearchParameters.class);
                    if (searchParameters == null) {
                        throw new NullPointerException();
                    }
                } catch (Exception ignored) {
                    LogUtil.warnLog("Bad request: " + request, "Empty token");
                    return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.INVALID_SEARCH_PARAMETERS)));
                }

                Token token;
                if (searchParameters.token == null) {
                    if (!session().containsKey("token")) {
                        LogUtil.warnLog("Unauthorized access: null token from " + request().remoteAddress(), "Null token");
                        return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.NULL_TOKEN)));
                    }
                    token = Token.findByUUID(session().get("token"));
                    if (token == null) {
                        LogUtil.warnLog("Unauthorized access: null token from " + request().remoteAddress(), "Null token");
                        return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.NULL_TOKEN)));
                    }
                } else {
                    token = Token.findByUUID(searchParameters.token);
                }
                if (token == null) {
                    LogUtil.warnLog("Unauthorized access: bad token " + searchParameters.token + " from " + request().remoteAddress(), searchParameters.token);
                    return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.BAD_TOKEN)));
                }
                token.updateLastUsage();

                List<Filter> filters = convertFilters(searchParameters.filters);
                DatabaseSearcher databaseSearcher;
                List<CdrEntrySetDB> searchResults;

                try {
                    databaseSearcher = new DatabaseSearcher(DB_NAME, DB_USER_NAME, DB_USER_PASSWORD);
                    databaseSearcher.open();
                    searchResults = databaseSearcher.search(filters);
                    databaseSearcher.close();
                } catch (Exception e) {
                    LogUtil.errorLog("Search error \nFilters used: " + filters.toString(), searchParameters.token);
                    e.printStackTrace();
                    return badRequest(Json.toJson(new ErrorResponse(ServerErrorCode.SEARCH_ERROR)));
                }
                for (CdrEntrySetDB searchResult : searchResults) {
                    for (EntryDB entryDB : searchResult.getCdrEntries()) {
                        entryDB.setParent(null);
                    }
                }
                return ok(Json.toJson(searchResults));
            }
        });
    }

}
