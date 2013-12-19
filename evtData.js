/**
 * @file Defines the evtData utilities for {@link sequence-viz}
 * @author Sigfried Gold <sigfried@sigfried.org>
 * @license http://sigfried.mit-license.org/
 * Don't trust this documentation yet. It's just beginning to be
 * written.
 */

'use strict';
var evtData = function() {
    /** @namespace evtData */
    // public
    var   entityIdProp
        , eventNameProp
        , startDateProp
        , oneDay = 1000 * 60 * 60 * 24
        , unitProp = oneDay
        , eventOrder
        , hiddenEvents = []
        //, timelineArray
        , eventNameArray
        , origDataRef
        , rawRecsImmutable
        , filterFunc = function() { return true }
        ;
    // private
    /*
    rawRecs:        array of raw event objects, each expected to have an
                    entityId, and eventName, and a start date string

    timelineArray:  rawRecs grouped by entityId. each entity has a records 
                    array pointing to its raw event records and each of
                    those should have a pointer back to the timeline and
                    should be sorted in time order and should have
                    nextEvt/prevEvt pointers as appropriate

    eventNameArray: rawRecs grouped by eventName 

    OBSOLETE nodeArray:      timelines turned into a flattened tree using the 
                    lifeflow layout I added to D3 based on the hierarchy
                    layout. lots of ways to make these depending on where
                    you want the root to be and whether you're building the
                    hierarchy forwards in time or back
    */

        /*
    function curry3(fun) {
        return function(last) {
            return function(middle) {
                return function(first) {
                    return fun(first, middle, last);
                };
            };
        };
    }
    function addCalcField(o, fun, fieldName) { 
        // clones o and adds new field with value resulting from calling
        // fun on the clone
            var c = _.clone(o);
            c[fieldName] = fun(c);
            return c;
    }
    function idGen(pref) { // generator for unique ids
        return function() {
            return _.uniqueId(pref) 
        }
    }
    // addEid returns a function that takes an object, clones it,
    //  and adds eId field containing a unique id starting with 'e'
    var addEid = curry3(addCalcField)('eId')(idGen('e'))
    var addStartDate = curry3(addCalcField)('_startDate')(function(rawRec) {
        return toDate(rawRec[startDateProp]); });
    */
    function edata(data) {
        origDataRef = data;
        edata.eventNames();
        rawRecsImmutable = _.chain(origDataRef)
                            //.tap(log)
                            .map(makeEvt) // add ids to clones of data objs
                            //.tap(log)
                            .filter(filterFunc)
                            //.tap(log)
                            .tap(makeTimelines)
                            .value();
        freezeList(rawRecsImmutable);
        return edata;
    };
    edata.newFilter = function(fun) {
        var newEdata = evtData()
                    .entityIdProp(entityIdProp)
                    .eventNameProp(eventNameProp)
                    .startDateProp(startDateProp)
                    .filterFunc(fun)
                    (origDataRef)
        return newEdata;
    };
    edata.subSelection = function(records) {
        var selected = [];
        selected.length = origDataRef.length;
        _(records).each(function(d) {
            selected[d.eId] = true;
        });
        return edata.newFilter(function(rec) {
            return selected[rec.eId];
        });
    };
    function log(o) { console.log(o) };
    /*
    function eventName() {}
    eventName.prototype.toggleReturnNew = function() {
        var evtList = eventNameArray.rawValues();
        var disabled = _.chain(eventNameArray)
                            .filter(function(e) { return e.disabled; })
                            .invoke('toString')
                            .value();
        if (this.disabled) {
            disabled = _(disabled).without(this.valueOf());
        } else {
            disabled.push(this.valueOf());
        }
        var evtFilter;
        if (disabled.length > evtList.length / 2) {
            evtFilter = function(rec) {
                return evtList.indexOf(rec[eventNameProp]) !== -1;
            };
        } else {
            evtFilter = function(rec) {
                return disabled.indexOf(rec[eventNameProp]) === -1;
            };
        }
        return edata.newFilter(evtFilter).setEventNames(evtList, disabled)
    };
    */
    /*
    function evtIsActive(evt) {
        return !eventNameArray.lookup(evt[eventNameProp]).disabled;
    }
    */
    edata.setEventNames = function(nameList, disabledList) {
        eventNameArray = enlightenedData.group(
            _(nameList).map(function(d) {return {name:d}}),'name');
        if (disabledList) {
            _(disabledList).each(function(d) {
                var name = eventNameArray.lookup(d);
                if (name) {
                    name.disabled = true;
                } else {
                    fail("can't find " + d + " in " + nameList.join(','))
                }
            });
        }
        _(eventNameArray).each(function(d) {
            _.extend(d, eventName.prototype);
        });
        freezeList(eventNameArray);
        return edata;
    }
    edata.eventNames = function() {
        if (eventNameArray) {
            return eventNameArray;
        }
        eventNameArray = enlightenedData.group(origDataRef, eventNameProp);
        _(eventNameArray).each(function(d) {
            _.extend(d, eventName.prototype);
        });
        freezeList(eventNameArray);
        return eventNameArray;
    }
    function fail(thing) {
        throw new Error(thing);
    }
    function toDate(dateStr, lowerBound, upperBound) {
        lowerBound = lowerBound || new Date('01/01/1600');
        upperBound = upperBound || new Date('01/01/2100');
        var dt = new Date(dateStr);
        if (!(dt > lowerBound && dt < upperBound)) {
            fail("invalid date string: " + dateStr);
        }
        return dt;
    }
    function timeline() {}
    timeline.prototype.startDate = function() {
        return this.records[0].startDate();
    }
    timeline.prototype.endDate = function() {
        return this.records[this.records.length - 1].startDate();
    }
    timeline.prototype.duration = function(unit) {
        unit = unit || unitProp || oneDay; // specify unit in # of miliseconds
        return Math.round((this.endDate() - this.startDate()) / unit)
    }
    function makeEvt(o, i) {
        var e = _.extend(new evt(), o);
        //e.eId = _.uniqueId('e');
        // need evts to get the same ID between calls
        e.eId = i;
        e._startDate = toDate(e[startDateProp]);
        e._entityId = e[entityIdProp];
        e._eventName = e[eventNameProp];
        return e;
    }
    function evt() {}
    evt.prototype.id = function() {
        return [this._entityId, this._eventName, this._startDate].join('/');
    }
    evt.prototype.startDate = function() {
        return this._startDate;
    }
    evt.prototype.eventName = function() {
        return this._eventName;
    }
    evt.prototype.entityId = function() {
        return this._entityId;
    }
    evt.prototype.next = function() {
        return this.timeline().records[this.evtIdx() + 1];
    }
    evt.prototype.prev = function() {
        return this.timeline().records[this.evtIdx() - 1];
    }
    evt.prototype.toNext = function(unit) {
        if (this.next()) {
            return this.timeTo(this.next(), unit);
        }
    };
    evt.prototype.fromPrev = function(unit) {
        if (this.prev()) {
            return this.prev().timeTo(this, unit);
        }
        return 0;
    };
    evt.prototype.startIdx = function(unit) {
        unit = unit || unitProp || oneDay; // specify unit in # of miliseconds
        return Math.round((this.startDate() - this.timeline().startDate()) / unit);
    };
    evt.prototype.timeTo = function(otherEvt, unit) {
        if (!otherEvt) return 0;
        return otherEvt.startIdx(unit) - this.startIdx(unit);
    };
    evt.prototype.timeline = function (_) {
        if (!arguments.length) return this._timeline;
        this._timeline = _;
        return this;
    };
    evt.prototype.evtIdx = function (_) {
        if (!arguments.length) return this._evtIdx;
        this._evtIdx = _;
        return this;
    };
    var makeTimelines = function(data) {
        var rawRecs = _.chain(data)
                            //.tap(log)
                            .map(makeEvt) // add ids to clones of data objs
                            //.tap(log)
                            .filter(filterFunc)
                            //.tap(log)
                            .value();
        var idFunc = function(d) { return d.entityId() };
        var timelineArray = enlightenedData.group(rawRecs, idFunc);
        _(timelineArray).each(function (tl, i) {
            _.extend(tl, timeline.prototype);
            //var addTimelineToRec = curry3(addCalcField)('timeline')(function(){return tl});
            // too hard to maintain immutability through all this
            tl.records.sort(function (a, b) {
                var cmp = a.startDate() - b.startDate();
                if (cmp === 0) {
                    if (eventOrder) {
                        cmp = eventOrder.indexOf(a.eventName())
                            - eventOrder.indexOf(b.eventName())
                    }
                }
                return cmp;
            })
            _.each(tl.records, function (r, i) {
                r.timeline(tl);
                r.evtIdx(i);
            })
            tl._evtLookup = {};
            tl.evtLookup = function(evtName) {
                //throw new Error('need to fix for dup evts');
                console.log('FIX DUP PROBLEM!!!')
                if (_(this._evtLookup).has(evtName)) {
                    return this.records[this._evtLookup[evtName]];
                }
            }
            _.each(tl.records, function (r, i) {
                if (!_(tl._evtLookup).has(r.eventName())) {
                    tl._evtLookup[r.eventName()] = i;
                }
            });
            /*
            tl.startDate() = tl.records[0].startDate();
            tl.endDate = tl.records[tl.records.length - 1].endDate;
            tl.days = tl.records[tl.records.length - 1].dayIdx + 1; // days for last rec is always 1
            tl.activeRecords = function() {
                return _(this.records).filter(function(rec) {
                    return !eventNameArray.lookup(rec[eventNameProp]).disabled;
                });
            }
            //tl.firstEvt = tl.records[0][eventNameProp];
            */
        });
        timelineArray.sort = function(func) {
            return enlightenedData.addGroupMethods(this.slice(0).sort(func));
        }
        timelineArray.evtDurationSortFunc = function(evtName) {
            return function(a,b) {
                var arec = a.evtLookup(evtName);
                var brec = b.evtLookup(evtName);
                if (!arec && !brec) return 0;
                if (!arec) return 1;
                if (!brec) return -1;
                var A = arec.toNext();
                var B = brec.toNext();
                A = isNaN(A) ? -Infinity : A;
                B = isNaN(B) ? -Infinity : B;
                return B - A;
                if (B < A) return -1; // descending order
                if (A < B) return 1;
                if (A === B) return 0;
                throw new Error("what did I forget?")
            }
        }
        timelineArray.sortByEvtDuration = function(evtName) {
            return this.sort(this.evtDurationSortFunc(evtName));
        };
        timelineArray.data = function() {
            return rawRecs;
        }
        freezeList(rawRecs);
        freezeList(timelineArray);
        return timelineArray;
    }
    edata.timelines = function(data) {
        var clone = unfreezeList(data);
        return freezeList(makeTimelines(clone));
    };
    edata.entityIdProp = function (_) {
        if (!arguments.length) return entityIdProp;
        entityIdProp = _;
        return edata;
    };
    edata.eventNameProp = function (_) {
        if (!arguments.length) return eventNameProp;
        eventNameProp = _;
        return edata;
    };
    edata.startDateProp = function (_) {
        if (!arguments.length) return startDateProp;
        startDateProp = _;
        return edata;
    };
    edata.unitProp = function (_) {
        if (!arguments.length) return unitProp;
        unitProp = _;
        return edata;
    };
    edata.endDateProp = function (_) {
        if (!arguments.length) return endDateProp;
        endDateProp = _;
        return edata;
    };
    edata.filterFunc = function (_) {
        if (!arguments.length) return filterFunc;
        filterFunc = _;
        return edata;
    };
    edata.origDataRef = function () {
        return origDataRef;
    };
    edata.data = function () {
        return rawRecsImmutable;
    };
    edata.makeTimelines = makeTimelines;
    function canLookup(o) {
        // don't have a decent test for enlightenedData lists or values
        if (_.isFunction(o.lookup)) {
            if (o instanceof Array) return true;
            if (o.kids) return true; // can lookup on vals if they have kids
        }
    }
    function freezeList(list) {
        if (canLookup(list)) {
            // have to initialize enlightenedData lookup lists before freezing
            list.lookup('foo'); 
        }
        _(list).each(function(d) {
            if (canLookup(d)) {
                d.lookup('foo'); 
            }
            Object.freeze(d);
        });
        Object.freeze(list);
        return list;
    };
    function unfreezeList(list) {
        return _(list).map(_.clone);
    }
    return edata;
}
