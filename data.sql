-- Dohvaćanje pitanja za 'Energija' kategoriju
select * 
  from esg_pitanja
 where ept_epk_id = 5364290878

-- Dohvaćanje pitanja za 'Energija' kategoriju
  select eou_id, ept_id, 
         ept_ess_id, 
		 ept_rbr, 
		 ept_pitanje, 
		 ept_vrstaodg, 
		 ept_jedmjer, 
		 ept_format, 
		 ept_opis, 
		 ept_uvjetovan, 
		 p.*, 
		 o.* 
    from esg_zag_upitnik, 
	     esg_odg_upitnik o, 
		 esg_pitanja p 
   where eou_ezu_id = ezu_id 
     and ept_id = eou_ept_id 
     and ezu_id = 1
     and ept_ess_id = 5364290878
order by ept_rbr