## VDJdb server REST API

### Columns

Information on database columns (such as their IDs, names and other metadata) can be obtaining by performing a GET request to ``https://vdjdb.cdr3.net/search/columns``.
For example 
```bash 
curl -X GET https://vdjdb.cdr3.net/search/columns
```
will return
```json
    {
        "columns": [
            ...
            {
                "column": {
                    "name":"gene", 
                    "metadata" : {
                        "visible" : "1",
                        "name" : "gene",
                        "comment" : "TCR chain: alpha or beta.",
                        "data.type" : "factor",
                        "type" : "txt",
                        "title" : "Gene",
                        "searchable" : "1"
                    }
                },
                "autocomplete" : true,
                "values" : [ "TRA" , "TRB" ]
            }
            ...
        ]
    }
```

### Search

You can query the database by sending a POST request with a specific JSON content to ``https://vdjdb.cdr3.net/search``.

The structure of JSON query is the following:
```json
    {
        "textFilters": [
            ...
        ],
        "sequenceFilters": [
            ...
        ]
    }
    
```
Where the **text filter** structure is
```json
    {
        "columnId": "(string)",     //Column name
        "value": "(string)",        //Search value
        "filterType": "(string)",   //Filter type: exact, pattern, substring, level
        "negative": (boolean)       //Negative filter
    }
```
and the **sequence filter** structure is
```
    {
        "columnId": "(string)",     //Column name (alpha.cdr3, antigen.epitope, etc)
        "query": "(string)",        //Search query
        "mismatches": (int),        //The number of mismatches
        "insertions": (int),        //The number of insertions
        "deletions": (int),         //The number of deletions
        "mutations": (int)          //Total number of differences allowed
    }
```

Sequence filters can only be applied to columns with ``"type": "seq"`` and will run an alignment (more precicely, a tree search). Text filters can be specified for any available column.

For example, the following request
```bash
curl -H "Content-Type: application/json" -X POST -d '{ "textFilters" : [{"columnId":"cdr3", "value":"CAAAASGGSYIPTF", "filterType":"exact", "negative":false }], "sequenceFilters" : [] }' https://vdjdb.cdr3.net/search
``` 

will produce

```json
    {
        "pageSize": 100,
        "results": [
            {
                "row": {
                    "index": 1923
                    "entries": [
                        {
                            "column": {
                                ... // see above
                            },
                            "value": "222"
                        },
                        {
                            "column": {
                                ... // see above
                            },
                            "value": "TRA"
                        },
                        {
                            "column": {
                                ... // see above
                            },
                            "value": "CAAAASGGSYIPTF"
                        },
                        ...
                    ]       
                },
                "sequenceSearchResults" : []
            }
        ],
        "columns": {
            .. // see above
        },
        "warnings": [],     // Array of strings
        "totalItems": 1     // Total items
    }
```