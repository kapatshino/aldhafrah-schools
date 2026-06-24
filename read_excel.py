import pandas as pd,json,math
p='FE C7 SCHOOLs.xlsx'; df=pd.read_excel(p, dtype={'school_id':str,'engineer_phone':str}).fillna('')
req=['school_id','school_name_ar','school_name_en','latitude','longitude','engineer_name_ar','engineer_name_en','engineer_email','engineer_phone','google_maps_url']
missing=[x for x in req if x not in df.columns]
if missing: raise ValueError('Missing: '+','.join(missing))
def s(v): return str(v).strip()
def valid(v):
 try: return float(v)
 except: return None
out=[]
for _,r in df.iterrows():
 lat,lng=valid(r.latitude),valid(r.longitude)
 if lat is None or lng is None: continue
 out.append({'school_id':s(r.school_id),'school_name_ar':s(r.school_name_ar),'school_name_en':s(r.school_name_en),'latitude':lat,'longitude':lng,'engineer_name_ar':s(r.engineer_name_ar),'engineer_name_en':s(r.engineer_name_en),'engineer_email':s(r.engineer_email),'engineer_phone':s(r.engineer_phone).replace('.0',''),'google_maps_url':s(r.google_maps_url)})
json.dump(out,open('schools.json','w',encoding='utf8'),ensure_ascii=False,indent=2)
print(len(out))
