import schema "schema";
import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";

module {
  public class Storage() {
    // 初期値
    public var state : schema.State = {
      publicKeyList = HashMap.HashMap<Principal, schema.PublicKeyListForPerson>(0, Principal.equal, Principal.hash);
      config = {
        env = #Development;
        keyName = "dfx_test_key";
        signCycles = 0;
      };
    };
  };
};
