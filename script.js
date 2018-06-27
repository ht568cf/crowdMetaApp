var CrowdApp =  {
    _input:[],
    _inputAddress:null,
    _actualInput:null,
    _output:[],
    _outputAddress:[],
    _needCheck:false,
    _metas:[],
    _metasScores:[],
    _FIELDS:[],
    _TYPES:[],
    _CONFIG:[],
    _SPLITTERS:[],
    _TRANS_UITEXT:{},
        
    _setMetas: function(data){
        var self = this;
        if (!data){
            var temp = []
            $("#metaCrowdApp #data p").children().each(function (param) {  
                var text = self._getTextFromUiMeta($(this).html())
                temp.push(text);
            });
            self._metas=temp;
        }
        if (typeof data == "string"){
            self._metas = self._splitDataByPontuaction(data)
            return true; 
        }
        return false;
    },

    _setMetasScores: function(){        
        var self = this;
        var FIELDS = self._FIELDS;
        var METAS = self._metas;
        var metaScores = []
        var matchLog="";
        for (metaIdx in METAS){ // words
           matchLog+="\nmeta: "+metaIdx+" | " + METAS[metaIdx]
            var splittersIdx = self._getSplitterIdx(METAS[metaIdx])
            if (splittersIdx >=0){
               matchLog+="\nsplitter: "+ splittersIdx
                metaScores[metaIdx] = splittersIdx;
                continue;
            }
            metaScores[metaIdx] ={}
            for (const fieldIdx in FIELDS) {
                for (const regExpIdx in FIELDS[fieldIdx].regExp){
                    if (METAS[metaIdx].match(new RegExp(FIELDS[fieldIdx].regExp[regExpIdx],"gm"))){
                        matchLog+="\n|match| "+ FIELDS[fieldIdx].name+" | "+regExpIdx 
                        if(!metaScores[metaIdx][fieldIdx]){
                            metaScores[metaIdx][fieldIdx]=0;
                        }
                        metaScores[metaIdx][fieldIdx]+=1;
                    }
                }
            }
        }
        self._metasScores = metaScores;
    },

    _setInput: function(input){
        var self = this

        var tempArr = self.validateInput(input); 
        
        if (tempArr.length>0){
            self._input = tempArr;
            return true
        }

        var inUrl = self.isUrl(input)
        if (inUrl){
            this._inputAddress = inUrl
            self._getMetasFromUrl(inUrl)                    
            return true
        }
        
        //_load sample
        self._getMetasFromUrl("metaCrowdApp/samples.json")

        return true;
    },

    _done:function () {
        console.log("!!!!!!!!",this._output)
        this._output[this._output.length-1]["output"] ={}
        this._output[this._output.length-1]["output"] = this._getSolution()
        if (this._input.length>0){
            this._execute()
        }else{
            this._sendSolution()
            this.close();
        }
    },
    
    _sendSolution: function () {
        var self = this
        if(!self._outputAddress){
            return false
        }
        var outUrl=self.isUrl(self._outputAddress)
        if (outUrl){
            var noWait = true;  
            if (self._needCheck){
                noWait=false;
            }
            $.ajax({
                type: "POST",
                url: self._outputAddress,
                data: self._output,
                success: function (response) {  
                    return response
                },
                dataType: "json",
                async: noWait
            });
        }else{
            var temp = $("<pre>",{
                        html: JSON.stringify(self._output, undefined, 2)
                        })
            $(self._outputAddress).html("").append(temp)
            self._output = []
        }

    },

    getConfigJson: function (){
        var temp ={}
        temp["fields"] =_FIELDS; 
        temp["types"] =_TYPES; 
        temp["config"] =_CONFIG; 
        temp["splitters"] =_SPLITTERS; 
        temp["translate"] =_TRANS_UITEXT; 

        var ui = $("<pre>",{
            html: JSON.stringify(self._output, undefined, 2)
            })
        return ui
    },

    _execute: function () {
        self=this
        if (self._input.length>0){
            var data = this._input.shift();
            self._output.push({"input":data})
            self._setMetas(data);
            self._makeMetaUi();
            self._reloadDragDrop();
            if (self._CONFIG.autoSort && self._metas.length>0){
                self._sortMetas()
            } 
            
            self._reloadDragDrop();
        }else{
            self._done();
        }
    },

    _getMetasFromUrl: function(url){
        var self = this;
        $.ajax({
            dataType: "json",
            url: url,
            success: function(responseJson) {
                self._input=responseJson;
            },
            async:false,
            fail: function( jqXHR, textStatus, errorThrown ) {
                self.close()
            }
        });
    },

    run: function (input, configAddress, outputAddress) {
        var self = this
        self._setInput(input)
                
        if(self._input.length==0){
            return false
        }

        var html, css;
        if ($("#metaCrowdApp").length){
            $("#metaCrowdApp").show()
            self._clearSolution()
            self._execute()
            return true
        }

        if (outputAddress){
            self._outputAddress = outputAddress
        }

        $("<div>",{ id:"metaCrowdApp", class:'modal', style:'display:block',
            html: $("<div>",{ class:'modalDialog', id:'crowdAppCont',
                   })
        }).appendTo("body");

        $.when(
            $.get("metaCrowdApp/app.html", function(htmlFile) {
                html = htmlFile;
            }),
        
            $.get("metaCrowdApp/style.css", function(cssFile) {
                css = cssFile;
            }),

            $.getJSON(configAddress,function(responseJson) {
                self._FIELDS = responseJson.fields; 
                self._TYPES = responseJson.types;
                self._CONFIG = responseJson.config;
                self._SPLITTERS = responseJson.splitters;
                self._TRANS_UITEXT= responseJson.exibTransl;

            }),

        ).then(function() {
            $("<style />").html(css).appendTo("head");
            $('#crowdAppCont').empty().append(html);
            self._makeButtons();
            self._execute();
            return true;
        });  
        return false;
    },

    isUrl: function(phrase){
        if(!phrase){
            return false
        }
        var pattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)$/gm;
        var match = phrase.match(pattern);
        if (match){
            return true;
        }
        return false;

    },

    validateInput(input){
        var result = [];
        result = input.split(new RegExp("[\n\r]", "g"));
        if (result.length>0){ 
            for (var index = 0; index < result.length; index++) {
                if (result[index].match(new RegExp("(\\S{2,}\\s+){6,}", "g"))==null){
                    result.splice(index, 1);
                    index--;
                }
            }
        }
        return result;
    },
   
    _getSplitterIdx(string){
        var self = this;
        var result = -1
        $.each(self._SPLITTERS, function (i, v){
            if (string.match(new RegExp(v.regExp,"g"))) {
                result = i;
                return false;
            }
        })
        return result;
    },

    _getTranslatedText : function (names){
        var texts = this._TRANS_UITEXT[names[0]];
        return ($.type(texts)==='array') ? texts[this._getSelectedLanguage()] : texts[names[1]][this._getSelectedLanguage()]
    },

    _getSelectedLanguage : function(){
        return $('#language option:selected').attr("value");
    },

    _getSelectedType : function(attr){
        return $('#type option:selected').attr(attr);
    },

    _reloadDragDrop: function () {
        self = this;
        $('.draggable , .sortable').each(function(){
            self._eventHandler($(this));
        });
        self._eventHandler($('.splitter'));
        self._eventHandler($('.trash'));
    },

    _eventHandler:function($el){
        self=this;

        if ($el.hasClass("splitter")){
            $el.dblclick(function(e){
                var $el = $(this);
                if (self._isSplitWord($el.html())){
                    var $elParent = $(this).parent();
                    if ($elParent.hasClass("editableMetaData")){
                        var $elParentNext = $('<span />').addClass("draggable editableMetaData").append($el.nextAll().clone());
                        self._eventHandler($elParentNext);
                        var $elParentSplit = $('<span />').append($el.clone());
                        self._eventHandler($elParentSplit.children());
                        $el.nextAll().remove();
                        $el.remove();
                        $elParent.after($elParentNext).after($elParentSplit);
                    }else{//join
                        var $elClone = $el.clone();
                        self._eventHandler($elClone);
                        $el.parent().prev().append($elClone,$el.parent().next().children());
                        $el.parent().next().remove();
                        $el.parent().remove();
                    }
                    $("#metaCrowdApp #data .draggable").unbind('mouseenter mouseleave')
                    $("#metaCrowdApp #solution .title").removeClass('highlight')
                }
            });
        };

        if ($el.hasClass("trash")){
            $el.droppable({
                drop: function( event, ui ) {
                    if($(ui.draggable).parent().hasClass("sortable")){
                        $("#data .draggable").each( function () {  
                            if ($(this).html()==$(ui.draggable).html() && !$(ui.draggable).hasClass("highlight") && $(this).hasClass("highlight")){
                                $(this).removeClass("highlight")
                            }
                        })
                        $(ui.draggable).remove();
                    }
                }
            })
        }

        if ($el.hasClass('draggable')){
            $el.draggable({
                connectToSortable: ".sortable",
                revert: "invalid",
                containment: "#app",
                cursorAt: {botton: 0, left: 0},
                }).disableSelection();
           if($el.parent().is("p")){
                $el.draggable( "option", "helper", "clone" );
                $el.hover( function () {
                    var metaIdx = $(this).index();
                    if(!self._metasScores[metaIdx]){return false}
                    $.each(self._metasScores[metaIdx], function (i, v) {
                        if (v>0){  
                            $("#metaCrowdApp #solution .title[value='"+i+"']").addClass("highlight");
                        }
                    })
                },
                function () {
                    var metaIdx = $(this).index();
                    if(!self._metasScores[metaIdx]){return false}
                    $.each(self._metasScores[metaIdx], function (i, v) {
                        if (v>0){  
                            $("#metaCrowdApp #solution .title[value='"+i+"']").removeClass("highlight");
                        }
                    })
                }) 
            }
            
        };

        if ($el.hasClass('sortable')){
            $el.sortable({
                connectWith: ".sortable, .droppable",
                revert: 100,
                cursorAt: {top: 0, left: 0},
                containment: "#app",
                over: function (event, ui) {
                    $( this ).addClass("highlight")
                },
                out: function (event, ui) {
                    $( this ).removeClass("highlight")
                },
                receive: function(event, ui) {
                    if(!ui.item.parent().hasClass("sortable")){
                        
                        ui.item.addClass("highlight");
                    }
                },
                start: function(e, ui){
                    ui.placeholder.height(ui.item.height());
                }
            });
        };

        if ($el.hasClass('editableMetaData')){
            $el.off("contextmenu").bind("contextmenu", function(e){
                var $el = $(this);
                var metaText = self._getTextFromUiMeta($el.html());
                $elInput = $('<input/>').attr('value', metaText).width($el.width());
                $el.find('span').hide();
                $el.append($elInput);
                var save = function(){
                    if (metaText == $elInput.val() ){
                        $elInput.remove();
                        $el.find('span').show();
                    }else{
                        var $elNew = self._getUiMetaFromText($elInput.val(), false )[0];
                        $el.after($elNew);
                        self._eventHandler($elNew);
                        $el.remove();   
                    }  
                };    
                $elInput.one('blur', save).focus();
                $("#metaCrowdApp #data .draggable").unbind('mouseenter mouseleave')
                $("#metaCrowdApp #solution .title").removeClass('highlight')
                return false;
            });
            self._eventHandler($el.children());
        };
    },

    _makeForm : function(typeIndex){
        var self = this;
        var typeIndex = self._getSelectedType("value");
        var $tableData = $('<table>',{id: 'tableData'});
        var fieldsIndex = self._TYPES[typeIndex].graph;
        var temp = []

        $.each(fieldsIndex, function (index, value) {
            var $row = $('<tr>');
            if(index==99){
                return true;
            }
            if (self._FIELDS[index].size==0) {
                temp.push(self._makeSubForm(index,1));
                if (temp.length==2){
                    $.each(temp,function(){
                        $row.append(this) 
                    })
                    temp = [];
                    $tableData.append($row);                      
                }
                
            }else{
                var sub = self._makeSubForm(index, 3);
                $row.append(sub);
                $tableData.append($row);
            }
            if(temp.length==1){
                $tableData.append(temp[0])
            }
            
        });
        $("#solution").empty().append($tableData);
        self._reloadDragDrop();
        
    },

    _makeSubForm: function(metaFieldIdx, cols) {
        self = this;
        var name = self._FIELDS[metaFieldIdx].name
        return [           
                    $('<td>', {
                        value: metaFieldIdx,
                        class: 'title', 
                        name: name,
                        html: self._getTranslatedText([self._FIELDS[metaFieldIdx].name, self._getSelectedType("name")]),
                        
                    }),
                    $('<td>',{
                        value: metaFieldIdx,
                        name: name,
                        class: 'data',
                        html: $('<div>', {class: 'sortable'})
                    }).attr('colSpan',cols)
                ]
    },

    close: function(){
        $("#metaCrowdApp").hide()
        self._output =[]
        self._input =[]
    },

    _makeButtons: function(){
        self = this;   
        $("#metaCrowdApp .button").tooltip({
            show: null,
            position: {
              my: "left top",
              at: "center bottom+3"
            }, 
        });

      
        $("#metaCrowdApp #header").append($("<ul>",{
            class:"right",
            html: $("<li>",{
                class:"button",
                html: $("<img>",{
                    src:"metaCrowdApp/icon/remove.png"
                }),
                click: function(){
                    self.close()
                }
            })
            
        }))

        $('#metaCrowdApp #new').click(function () {
            if(self._output.length>0 && self._input.length>0){
                self._output.pop();
                self._execute();
            }
          
        });

        $('#metaCrowdApp #clear').click(function () {
            self._clearSolution()
        });

        $('#metaCrowdApp #sort').click(function () {
            self._setMetas() 
            self._setMetasScores();
            self._sortMetas()
        });

        $('#metaCrowdApp #done').click(function () {
            self._done();
        });

        $('#metaCrowdApp #help').on({
            "click": function() {
                $(this).tooltip({ items: "#metaCrowdApp #help", content: self._getTranslatedText(["help"])});
                $(this).tooltip("open");
              },
              "mouseout": function() {      
                 $(this).tooltip("disable");   
              }
        });

        $.each(self._CONFIG.languages, function (index, value) {
            $("#language").append($('<option/>', {
                value: index,
                text: value
            }));
        });

        $.each(self._TYPES, function (index, value) {
            $('#type').append($('<option/>', {
                value: index,
                text: value.name,
                name: value.name
            }));
        });

        $("#metaCrowdApp #type").change(function () {
            self._makeForm();
            self._sortMetas(true);
        });
        
        $('#metaCrowdApp #language option:eq(2)').prop('selected', true)// selecionar a opção de incialização

        $('#metaCrowdApp #language').change(function () {
            self._updateLanguage();
           
        }).change();
    },

    _updateLanguage : function(){
        self = this;
        $("#metaCrowdApp #type option").each(function (){
            $(this).html(self._getTranslatedText([$(this).attr("name")]));
        });
        $("#metaCrowdApp #solution .title").each(function (){
            $(this).html(self._getTranslatedText([$(this).attr("name"), self._getSelectedType("name")]));
        });
        $("#metaCrowdApp #typeMenu p").html(function (){
            $(this).html(self._getTranslatedText([$(this).attr("name")]))
        });
        $("#metaCrowdApp #solution .button").each(function (){
            $(this).html(self._getTranslatedText([$(this).attr("name")]));
        });
        
        $("#metaCrowdApp #assuranceText").html(self._getTranslatedText(["assurance"]))

        $("#metaCrowdApp #new").attr("title",self._getTranslatedText(["newHelp"]))
        $("#metaCrowdApp #done").attr("title",self._getTranslatedText(["doneHelp"]))
        $("#metaCrowdApp #sort").attr("title",self._getTranslatedText(["sortHelp"]))
        $("#metaCrowdApp #clear").attr("title",self._getTranslatedText(["clearHelp"]))
    },

    _isSplitWord : function(text){
        return text.match(/([;,:\.\s\(\)])+/) ? true:false;
    },

    _getTextFromUiMeta :function(metaUi){
        var result =  metaUi.replace(/<\/?span[^>]*>/g,"");
        var parser = new DOMParser;
        result.replace(/([\.,;:])(\w)/g,"$1 $2");
        return parser.parseFromString(result, 'text/html').body.textContent
    },
    
    _isSplitPhrase(subMeta){
        return subMeta.match(/([;,\.])+/) ? true:false;
    },

    _isIrrelevant(subMeta){
        return subMeta.match(/^\s*$/) ? true:false;
    },

    _getUiMetaFromText:function(text, removePunctuation){
        var result = [];

        var dataArray = this._splitDataForUI(text);

        var temps = [];
        if (this._isIrrelevant(text)){
            return null;
        }
        if(dataArray.length==1 && this._getSplitterIdx(dataArray[0])>=0){
            return $('<span />',{
                        html: $('<span />',{
                                'html': dataArray[0],
                                "class" :"splitter"
                                })
                    })
        }
            
        for (i=0;i<dataArray.length;i++) {
            if (this._isSplitWord(dataArray[i])){
                var spanSplitter = $('<span />').html(dataArray[i]).addClass("splitter");
                if (removePunctuation && this._isSplitPhrase(dataArray[i])){
                    result.push($('<span />').addClass("draggable editableMetaData").append(temps.slice()));
                    result.push($('<span />').append(spanSplitter.slice()));
                    temps=[];   
                }else{
                    temps.push(spanSplitter.slice());
                }
            
            }else{
                temps.push($('<span />').html(dataArray[i]  )); 
            }
        }
        if (temps.length>0) {
            var $span =  $('<span />').addClass("draggable editableMetaData").append(temps.slice());
            result.push($span);
            temps = []
        }
        
        return result;
    },

    _splitDataForUI: function (data){
        var result = data.split(/([;:,\s\(\)\.])(?:\s*)/g).filter(Boolean);
        return result;
    },

    _splitDataByPontuaction: function (referenceString){
        var result = referenceString;
        for (const key in self._SPLITTERS) {
            if(self._SPLITTERS[key].replace){
                result = result.replace(new RegExp(self._SPLITTERS[key].replace,"g"), "$1|");    
            }
        }
        result = result.split(/([\.,:\(\);])(?:\|)(?:\s*)/g);
        return result.filter(Boolean);
    },

    _makeMetaUi : function(referenceString){
        var self =this
        var metas = self._metas;
        var aux = $('<p>')
        for (let i = 0; i < metas.length; i++) {
            aux.append(self._getUiMetaFromText(metas[i],false))
        }

        $("#metaCrowdApp #data").empty().append(aux);
    },
    
    _showAuxSortMenu: function(typeIdxs) {  
        var self = this;
        var $typeMenu = $("<div>",{
                    id: "sortTypeMenu",
                    html: $("<p>",{
                        name:"sortQuestion",
                        html: self._getTranslatedText(["sortQuestion"])
                    })
                })
        
        $.each(typeIdxs, function (i, typeIdx ){
            var type = self._TYPES[typeIdx]
            var $typeSelector = $("<div>",{
                                        value: typeIdx,
                                        name: type.name,
                                        class: "button",
                                        html: self._getTranslatedText([type.name]),
                                        click: function(){
                                                self._setSelectedType($(this).attr("value"), true)
                                    }})
            $typeMenu.append($typeSelector)
        })

        var $noneSelector = $("<p>",{
                                    name: "sortFailInfo",
                                    html: self._getTranslatedText(["sortFailInfo"]),
                            })
        $typeMenu.append($noneSelector)
        $("#solution").empty().append($typeMenu);
    },

    _getSolution: function(){
        var self = this
        var result ={}
        result.type = self._TYPES[(self._getSelectedType("value"))].name
        result.assurance = $("#metaCrowdApp #assurance").is(':checked')?"true":"false";
        result.fields = {};
        $.each($("#metaCrowdApp #solution .data"), function () {  

            if ( self._FIELDS[($(this).attr("value"))].splitReplaceAfter){
                var temp=[]

                $(this).children().find(".editableMetaData").each(function(){
                    temp.push(self._getTextFromUiMeta($(this).html()))
                })
                result.fields[self._FIELDS[($(this).attr("value"))].name] = temp;
            }else{
                result.fields[self._FIELDS[($(this).attr("value"))].name] = self._improveOutput(self._getTextFromUiMeta($(this).children().html()),$(this).attr("value"))
            }
        })
        return result;
    },

    _improveOutput: function(output, typeIdx){
        return output.replace(new RegExp(this._CONFIG.outputReplaceRegExp, "g"),"");
    },

    _clearSolution: function(){
        $.each($("#metaCrowdApp #solution .data .sortable"), function () {  
            $(this).html("");
        })
        $.each($("#metaCrowdApp .draggable"), function () {  
            $(this).removeClass("highlight");
        })
    },

    _setSelectedType: function(typeIdx, sort){
        var self = this;
        if ($.isNumeric(typeIdx)){
            $("#type option:eq("+typeIdx+")").prop('selected', true)
            self._makeForm();
            if(sort){
                self._makeForm();
                $("#type").change()
            }
        }
    },

    _pondArrayByField: function(METAS){
        var self = this;
        var TYPES = self._TYPES;
        var FIELDS = self._FIELDS;
        var metaScores = []
        var matchLog="";
        for ( metaIdx in METAS){ // words
            matchLog+="\nmeta: "+metaIdx+" | " + METAS[metaIdx]
            var splittersIdx = self._getSplitterIdx(METAS[metaIdx])
            if (splittersIdx >=0){
                matchLog+="\nsplitter: "+ splittersIdx
                metaScores[metaIdx] = splittersIdx;
                continue;
            }
            metaScores[metaIdx] ={}
            for (const fieldIdx in FIELDS) {
                for (const regExpIdx in FIELDS[fieldIdx].regExp){
                    if (METAS[metaIdx].match(new RegExp(FIELDS[fieldIdx].regExp[regExpIdx],"gm"))){
                        matchLog+="\n|match| "+ FIELDS[fieldIdx].name+" | "+regExpIdx 
                        if(!metaScores[metaIdx][fieldIdx]){
                            metaScores[metaIdx][fieldIdx]=0;
                        }
                        metaScores[metaIdx][fieldIdx]+=1;
                    }
                }
            }
        }
        self._metasScores = metaScores;
        return metaScores;
    },

    _sortMetas: function(single){
        var self = this;
        self._setMetasScores();
        var TYPES = self._TYPES;
        var metaIdx = 0
        var metaIdxNext = 0

        var FIELDS = self._FIELDS;
        var metas = self._metas;
        var metaScores = self._metasScores;

        $("#metaCrowdApp .draggable").removeClass("highlight")

        
       
        var typesWays ={};

        for(var typeIdx in TYPES){ //types
            typesWays[typeIdx]={"lastNodes":[[99]], "rate":0, "miss":0}
        }

        
        while ( metaIdx <metaScores.length ) {
            var splitters = self._getSplitterNodes(metaScores,metaIdx);
            var typeIdx= 0;
            if(single){
                typeIdx= self._getSelectedType("value");
            }
            for(typeIdx; typeIdx<TYPES.length;typeIdx++){
                if(single && typeIdx>self._getSelectedType("value")){
                    continue;
                }
                var wayNextNodes = [];
                for (const wayNodeIdx in typesWays[typeIdx].lastNodes[metaIdx]) {
                    var wayNode= typesWays[typeIdx].lastNodes[metaIdx][wayNodeIdx];
                    for (const nodeOut in  TYPES[typeIdx].graph[wayNode]) {
                        var matchCount = 0;
                        if(metaScores[metaIdx][nodeOut] && metaScores[metaIdx][nodeOut]>0){
                            matchCount+=1;
                            if(metaIdx>0 && TYPES[typeIdx].graph[wayNodeIdx][nodeOut] && TYPES[typeIdx].graph[wayNodeIdx][nodeOut].length>0){
                                var common = 0;
                                for (const splitterIdx in splitters) {
                                    if ($.inArray(splitters[splitterIdx], TYPES[typeIdx].graph[wayNodeIdx][nodeOut] )!==-1){
                                        matchCount+=2;
                                        self._pushIfNotExists(wayNextNodes,nodeOut)
                                    }
                                }
                            }else{//no spliiter indicated
                                matchCount+=1;
                                self._pushIfNotExists(wayNextNodes,nodeOut)
                            }
                        }
                        if(matchCount<0){//miss node
                            for (const missNodeIdx in TYPES[typeIdx].graph[wayNodeIdx]){
                                self._pushIfNotExists(wayNextNodes,TYPES[typeIdx].graph[wayNodeIdx][missNodeIdx])
                            }
                        }else{
                                                            
                        }                           
                        typesWays[typeIdx].rate+=matchCount;
                    }
                } 
                typesWays[typeIdx].lastNodes[(metaIdx+1+splitters.length)] = wayNextNodes.slice();
                typesWays[typeIdx].lastNodes[metaIdx] = wayNextNodes.slice();
            }
            metaIdx =metaIdx+1+splitters.length
        }


        var countArr=[]
        var count=0;
        $.each(typesWays,function(i,v){
            if (v.rate>count) {
                countArr=[]
                countArr.push(i)
                count = v.rate
            }else if(v.rate==count){
                countArr.push(i)
            }
        });
        
        


        if(countArr.length>1){
            self._showAuxSortMenu(countArr);
        }else{
            
            if(!single){
                self._setSelectedType(countArr[0], false)
            }
            var tempLast
            var prevIdx = null
            for (const metaIdx in typesWays[countArr[0]].lastNodes) {
                
               
                if(self._metas.length>metaIdx){
                    var probNodes = typesWays[countArr[0]].lastNodes[metaIdx]
                    if (probNodes.length==1){
                        self._moveMetaUi(metaIdx,metas[metaIdx],probNodes[0])
                    }
                    else{//no prob node 
                        if (prevIdx){
                            for (const key in probNodes) {
                                if(!$.inArray(key,typesWays[countArr[0]].lastNodes[prevIdx])){
                                    self._moveMetaUi(metaIdx,metas[metaIdx],probNodes[key])
                                }
                            }
                        }
                    }
                    
                    if (probNodes && probNodes.length==0){
                         
                         if(self._metasScores[metaIdx] && Object.keys(self._metasScores[metaIdx]).length==1){
                            
                             for (const key in self._metasScores[metaIdx]) {
                                 self._moveMetaUi(metaIdx,metas[metaIdx],key)
                             }
                             
                         }
                     }
                }
                prevIdx = metaIdx
                tempLast = typesWays[countArr[0]].lastNodes
            }
        }
    },

    _sortMetas2: function(single){
        var self = this;
        self._setMetasScores();
        var TYPES = self._TYPES;
        var metaIdx = 0
        var metaIdxNext = 0
       

        var FIELDS = self._FIELDS;
        var metas = self._metas;
        var metaScores = self._metasScores;
        
       
        var typesWays ={};

        for(var typeIdx in TYPES){ //types
            typesWays[typeIdx]={"lastNodes":[[99]], "rate":0, "miss":0}
        }

        
        while ( metaIdx <metaScores.length ) {
            var splitters = self._getSplitterNodes(metaScores,metaIdx);
            var typeIdx= 0;
            if(single){
                typeIdx= self._getSelectedType("value");
            }
            for(typeIdx; typeIdx<TYPES.length;typeIdx++){
                if(single && typeIdx>self._getSelectedType("value")){
                    continue;
                }
                var wayNextNodes = [];
                for (const wayNodeIdx in typesWays[typeIdx].lastNodes[metaIdx]) {
                    var wayNode= typesWays[typeIdx].lastNodes[metaIdx][wayNodeIdx];
                    for (const nodeOut in  TYPES[typeIdx].graph[wayNode]) {
                        var matchCount = 0;
                        if(metaScores[metaIdx][nodeOut] && metaScores[metaIdx][nodeOut]>0){
                            matchCount+=1;
                            if(metaIdx>0 && TYPES[typeIdx].graph[wayNodeIdx][nodeOut] && TYPES[typeIdx].graph[wayNodeIdx][nodeOut].length>0){
                                var common = 0;
                                for (const splitterIdx in splitters) {
                                    if ($.inArray(splitters[splitterIdx], TYPES[typeIdx].graph[wayNodeIdx][nodeOut] )!==-1){
                                        matchCount+=2;
                                        self._pushIfNotExists(wayNextNodes,nodeOut)
                                    }
                                }
                            }else{//no spliiter indicated
                                matchCount+=1;
                                self._pushIfNotExists(wayNextNodes,nodeOut)
                            }
                        }
                        if(matchCount<0){//miss node
                            for (const missNodeIdx in TYPES[typeIdx].graph[wayNodeIdx]){
                                self._pushIfNotExists(wayNextNodes,TYPES[typeIdx].graph[wayNodeIdx][missNodeIdx])
                            }
                        }else{
                                                            
                        }                           
                        typesWays[typeIdx].rate+=matchCount;
                    }
                } 
                typesWays[typeIdx].lastNodes[(metaIdx+1+splitters.length)] = wayNextNodes.slice();
                typesWays[typeIdx].lastNodes[metaIdx] = wayNextNodes.slice();
            }
            metaIdx =metaIdx+1+splitters.length
        }


        var countArr=[]
        var count=0;
        $.each(typesWays,function(i,v){
            if (v.rate>count) {
                countArr=[]
                countArr.push(i)
                count = v.rate
            }else if(v.rate==count){
                countArr.push(i)
            }
        });
        
        


        if(countArr.length>1){
            self._showAuxSortMenu(countArr);
        }else{
            
            if(!single){
                self._setSelectedType(countArr[0], false)
            }
            var tempLast
            for (const metaIdx in typesWays[countArr[0]].lastNodes) {
                if(self._metas.length>metaIdx){
                    var probNodes = typesWays[countArr[0]].lastNodes[metaIdx]
                    if (probNodes.length==1){
                        
                        self._moveMetaUi(metaIdx,metas[metaIdx],probNodes[0])
                    }
                    else{//no prob node 
                        for (const key in probNodes) {
                            
                            var tempArr =[];
                            $(".data").each( function(){
                                if($(this).attr("value")==key){
                                    tempArr.push(key)
                                }
                            })
                            if(temArr.length==1){
                                self._moveMetaUi(metaIdx,metas[metaIdx],tempArr[0])
                            }
                        }
                    }
                }
                tempLast = typesWays[countArr[0]].lastNodes
            }
        }
    },

    _pushIfNotExists:function (array, element) {  
        if ($.inArray(element, array)<0){
            array.push(element);
        }
    },

    _getSplitterNodes: function (pondMat, metaIdx) {  
        var result=[]

        for (var index = metaIdx+1; index < pondMat.length; index++) {
            if($.type(pondMat[index])!='number'){
               break;
            }
            result.push(pondMat[index])
        }
        return result;
    },

    _moveMetaUi:function (metaIdx, metaString, typeIdx) {  
        var self = this
        
        var $field = $("#metaCrowdApp #solution .data[value='"+typeIdx+"'] .sortable")
        if($field.length>0){
            var $meta = self._splitAfter(typeIdx,metaString, $field)
            if (!$meta){
                var $meta = self._getUiMetaFromText(metaString, false)
                $field.append($meta);
            }
            $("#metaCrowdApp #data p").children().eq(metaIdx).addClass("highlight")
        }
    },

    _splitAfter: function (typeIdx,referenceString, $elContainer){
        var self = this;
        if (!this._FIELDS[typeIdx].splitReplaceAfter){
            return false
        }
        var result = referenceString;
        for (const key in self._FIELDS[typeIdx].splitReplaceAfter) {
            result = result.replace(new RegExp(self._FIELDS[typeIdx].splitReplaceAfter[key],"g"), "$1|");    
    
        }

        
        result = result.split(/([\.,:\(\);&])(?:\|)(?:\s*)/g).filter(Boolean);
        for (const key in result) {
            $elContainer.append(self._getUiMetaFromText(result[key], false));
        }
        return true;
        
    },

    
}


